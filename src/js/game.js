import { AudioSystem } from './audio.js';
import { ShaderProgram, Framebuffer, Renderbuffer, Texture, Font, Renderer, SpriteBatch } from './graphics.js';

class GameObject {
    get objectType() { return 'GameObject'; }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) { }

    draw() { }
}

class TileEntity extends GameObject {
    get objectType() { return 'TileEntity'; }

    constructor(x, y, typeId, group = null) {
        super();

        this.x = x;
        this.y = y;
        this.typeId = typeId;
        this.lifetime = 0;
        this.isFalling = false;
        this.fallSpeed = 0.5;
        this.group = group;
    }

    /**
     * @param {number} deltaTime
     */
    update(deltaTime) {
        super.update(deltaTime);

        this.lifetime += deltaTime;
        if (!this.isFalling && this.lifetime > 2000)
            this.isFalling = true;

        if (this.isFalling)
            this.y += deltaTime * this.fallSpeed / TILE_SIZE;

        const EPSILON = 0.1;

        const entityBelow = getTileEntityAt(this.x + EPSILON, this.y + 1);
        if (getTileAt(this.x + EPSILON, this.y + 1) !== 0 || entityBelow !== null && entityBelow.group !== this.group) {
            objectDeleteQueue.add(this);
            playImpactSound();
            setTileAt(this.x, this.y, this.typeId);
        }
    }

    draw() {
        super.draw();

        const tileType = TILE_TYPES[this.typeId];
        const textureName = tileType.texture;
        const texture = textures[textureName];

        spriteBatch.drawRectangle(texture, this.x * TILE_SIZE, (this.y - viewOffsetY) * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, 1, 1, 1, 1, 1, 1);
    }
}

class Player extends GameObject {
    get objectType() { return 'Player'; }

    constructor() {
        super();

        this.x = Math.floor(TILES_COLUMNS / 2);
        this.y = 0;

        this.moveSpeed = 0.25;
        this.fallSpeed = 0.5;
        this.isOnGround = true;
    }

    update(deltaTime) {
        super.update(deltaTime);

        const EPSILON = 0.1;

        if (isKeyDown('KeyA') || isKeyDown('ArrowLeft')) {
            this.x -= deltaTime * this.moveSpeed / TILE_SIZE;
            breakTile(this.x, this.y + 0.5, deltaTime);
        }

        if (isKeyDown('KeyD') || isKeyDown('ArrowRight')) {
            this.x += deltaTime * this.moveSpeed / TILE_SIZE;
            breakTile(this.x + 1, this.y + 0.5, deltaTime);
        }

        if (isKeyDown('KeyS') || isKeyDown('ArrowDown')) {
            for (const offset of [0.5, 0.25, 0.75]) {
                if (breakTile(this.x + offset, this.y + 1, deltaTime))
                    break;
            }
        }

        if (isKeyDown('KeyW') || isKeyDown('ArrowUp'))
            breakTile(this.x + 0.5, this.y - EPSILON, deltaTime);

        if (this.x < 0)
            this.x = 0;

        if (this.x > TILES_COLUMNS - 1)
            this.x = TILES_COLUMNS - 1;

        if (getTileAt(this.x, this.y + EPSILON) !== 0 || getTileAt(this.x, this.y + 1 - EPSILON) !== 0
            || getTileEntityAt(this.x, this.y + EPSILON) !== null || getTileEntityAt(this.x, this.y + 1 - EPSILON) !== null)
            this.x = Math.ceil(this.x);

        if (getTileAt(this.x + 1, this.y + EPSILON) !== 0 || getTileAt(this.x + 1, this.y + 1 - EPSILON) !== 0
            || getTileEntityAt(this.x + 1, this.y + EPSILON) !== null || getTileEntityAt(this.x + 1, this.y + 1 - EPSILON) !== null)
            this.x = Math.floor(this.x);

        if (getTileAt(this.x + EPSILON, this.y + 1) !== 0 || getTileAt(this.x + 1 - EPSILON, this.y + 1) !== 0
            || getTileEntityAt(this.x + EPSILON, this.y + 1) !== null || getTileEntityAt(this.x + 1 - EPSILON, this.y + 1) !== null) {
            this.isOnGround = true;
            this.y = Math.floor(this.y);
        } else {
            this.isOnGround = false;
            this.y += deltaTime * this.fallSpeed / TILE_SIZE;
        }

        viewOffsetY = this.y - 5;
    }

    draw() {
        super.draw();

        spriteBatch.drawRectangle(textures['player'], this.x * TILE_SIZE, (this.y - viewOffsetY) * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, 1, 1, 1, 1, 1, 1);
    }
}

let objectDeleteQueue = new Set();

const TILE_TYPES = {
    1: { id: 1, texture: 'tile_sand', isMovable: true, breakTime: 100 },
    2: { id: 2, texture: 'tile_dirt', isMovable: true, breakTime: 150 },
    3: { id: 3, texture: 'tile_stone', isMovable: true, breakTime: 250 },
    4: { id: 4, texture: 'tile_block', isMovable: false, breakTime: 1000 },
};

const TILE_BLOCK = 4;
const TILES_COLUMNS = 7;
const TILE_SIZE = 64;

const tiles = [
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1,
];

function getNextBlockType() {
    if (Math.random() < 0.05)
        return TILE_BLOCK;

    return 1 + Math.floor(Math.random() * 3);
}

for (let j = 0; j < 1000; j++) {
    if (Math.random() < 0.1) {
        tiles.push(...[TILE_BLOCK, TILE_BLOCK, getNextBlockType(), getNextBlockType(), getNextBlockType(), TILE_BLOCK, TILE_BLOCK]);

        for (let i = 0; i < 7; i++)
            tiles.push(getNextBlockType());
    } else if (Math.random() < 0.1) {
        tiles.push(...[getNextBlockType(), getNextBlockType(), TILE_BLOCK, TILE_BLOCK, TILE_BLOCK, getNextBlockType(), getNextBlockType()]);

        for (let i = 0; i < 7; i++)
            tiles.push(getNextBlockType());
    } else if (Math.random() < 0.1) {
        tiles.push(...[getNextBlockType(), TILE_BLOCK, getNextBlockType(), TILE_BLOCK, getNextBlockType(), TILE_BLOCK, getNextBlockType()]);

        for (let i = 0; i < 7; i++)
            tiles.push(getNextBlockType());
    } else {
        for (let i = 0; i < 7; i++)
            tiles.push(getNextBlockType());
    }
}

let breakingTileX = -1;
let breakingTileY = -1;
let breakingTileProgress = 0;

let nextFallingBlockGroup = 0;

function getTileAt(x, y) {
    if (x < 0 || y < 0 || x > TILES_COLUMNS) return 0;

    const i = Math.floor(x) + Math.floor(y) * TILES_COLUMNS;
    if (i >= tiles.length) return 0;

    return tiles[i];
}

function getTileEntityAt(x, y) {
    for (const gameObject of gameObjects) {
        if (gameObject.objectType !== 'TileEntity') continue;
        if (gameObject.isFalling) continue;

        if (gameObject.x <= x && gameObject.y <= y && gameObject.x + 1 >= x && gameObject.y + 1 >= y)
            return gameObject;
    }

    return null;
}

function setTileAt(x, y, tileTypeId) {
    if (x < 0 || y < 0 || x > TILES_COLUMNS) return;

    const i = Math.floor(x) + Math.floor(y) * TILES_COLUMNS;
    if (i >= tiles.length) return 0;

    tiles[i] = tileTypeId;
}

function getAdjacentTilesOfSameType(x, y) {
    const result = [];
    const checked = [];
    const index = Math.floor(x) + Math.floor(y) * TILES_COLUMNS;
    const typeId = getTileAt(x, y);
    const queue = [index];
    while (queue.length) {
        const tileIndex = queue.pop();
        const tileX = tileIndex % TILES_COLUMNS;
        const tileY = Math.floor(tileIndex / TILES_COLUMNS);
        const tileTypeId = getTileAt(tileX, tileY);
        if (tileTypeId !== typeId)
            continue;

        result.push({ x: tileX, y: tileY, index: tileIndex, typeId: tileTypeId, type: TILE_TYPES[tileTypeId] });

        if (tileX > 0 && !checked.includes(tileIndex - 1))
            queue.push(tileIndex - 1);

        if (tileX < TILES_COLUMNS - 1 && !checked.includes(tileIndex + 1))
            queue.push(tileIndex + 1);

        if (tileY > 0 && !checked.includes(tileIndex - TILES_COLUMNS))
            queue.push(tileIndex - TILES_COLUMNS);

        if (!checked.includes(tileIndex + TILES_COLUMNS))
            queue.push(tileIndex + TILES_COLUMNS);

        checked.push(tileIndex);
    }

    return result;
}

function getTilesAbove(x, y) {
    const result = [];
    let typeId;
    while ((typeId = getTileAt(x, y)) !== 0 && TILE_TYPES[typeId].isMovable) {
        const tileIndex = Math.floor(x) + Math.floor(y) * TILES_COLUMNS;
        result.push({ x, y, index: tileIndex, typeId, type: TILE_TYPES[typeId] });
        y--;
    }

    return result;
}

function breakTile(x, y, deltaTime) {
    const tileTypeId = getTileAt(x, y);
    if (tileTypeId === 0) return false;

    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    if (breakingTileX === tileX && breakingTileY === tileY) {
        const breakTime = TILE_TYPES[tileTypeId].breakTime;
        breakingTileProgress += deltaTime / breakTime;
    } else {
        breakingTileX = tileX;
        breakingTileY = tileY;
        breakingTileProgress = 0;
    }

    if (breakingTileProgress > 1) {
        breakingTileX = -1;
        breakingTileY = -1;
        breakingTileProgress = 0;

        const adjacentTiles = getAdjacentTilesOfSameType(x, y);
        for (const { x, y } of adjacentTiles)
            setTileAt(x, y, 0);

        for (const { x: x0, y: y0 } of adjacentTiles)
            for (const { x, y, typeId } of getTilesAbove(x0, y0 - 1)) {
                setTileAt(x, y, 0);
                gameObjects.push(new TileEntity(x, y, typeId, nextFallingBlockGroup));
            }

        nextFallingBlockGroup++;
        playDigSound();
    }

    return true;
}

const SCENE_VERTEX_SHADER_SOURCE = `#version 300 es

uniform mat4 matrix;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;
out vec4 fragColor;

void main() {
    gl_Position = matrix * vec4(position, 0, 1);

    fragTexCoords = texCoords;
    fragColor = color;
}
`;

const SCENE_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D colorTexture;

in vec2 fragTexCoords;
in vec4 fragColor;

out vec4 color;

void main() {
    color = fragColor * texture(colorTexture, fragTexCoords);
}
`;

const FONT_VERTEX_SHADER_SOURCE = `#version 300 es

uniform mat4 matrix;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;
out vec4 fragColor;

void main() {
    gl_Position = matrix * vec4(position, 0.0, 1.0);

    fragTexCoords = texCoords;
    fragColor = color;
}
`;

const FONT_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D msdfTexture;
uniform float screenPxRange;
uniform float outlineBias;

in vec2 fragTexCoords;
in vec4 fragColor;

out vec4 color;

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

void main() {
    vec4 msd = texture(msdfTexture, fragTexCoords);

    float hardDistance = median(msd.r, msd.g, msd.a);
    float softDistance = msd.a;

    float inner = screenPxRange * (hardDistance - 0.5) + 0.5;
    float outer = screenPxRange * (softDistance - 0.5 + outlineBias) + 0.5;

    float innerOpacity = clamp(inner, 0.0, 1.0);
    float outerOpacity = clamp(outer, 0.0, 1.0);

    color = fragColor * innerOpacity + vec4(vec3(0.0), 1.0) * outerOpacity;
}
`;

const BLUR_VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;

void main() {
    gl_Position = vec4(position, 0, 1);

    fragTexCoords = texCoords;
}
`;

const BLUR_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

const float weight[5] = float[] (0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

uniform sampler2D colorTexture;
uniform bool horizontal;

in vec2 fragTexCoords;

out vec4 color;

void main() {
    vec2 texelSize = 1.0 / vec2(textureSize(colorTexture, 0));
    vec3 result = texture(colorTexture, fragTexCoords).rgb * weight[0];

    if (horizontal) {
        for (int i = 1; i < 5; i++) {
            result += texture(colorTexture, fragTexCoords + vec2(texelSize.x * float(i), 0.0)).rgb * weight[i];
            result += texture(colorTexture, fragTexCoords - vec2(texelSize.x * float(i), 0.0)).rgb * weight[i];
        }
    } else {
        for (int i = 1; i < 5; i++) {
            result += texture(colorTexture, fragTexCoords + vec2(0.0, texelSize.y * float(i))).rgb * weight[i];
            result += texture(colorTexture, fragTexCoords - vec2(0.0, texelSize.y * float(i))).rgb * weight[i];
        }
    }

    color = vec4(result, 1.0);
}
`;

const SCREEN_VERTEX_SHADER_SOURCE = `#version 300 es

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 texCoords;
layout(location = 2) in vec4 color;

out vec2 fragTexCoords;

void main() {
    gl_Position = vec4(position, 0.0, 1.0);

    fragTexCoords = texCoords;
}
`;

const SCREEN_FRAGMENT_SHADER_SOURCE = `#version 300 es

precision mediump float;

uniform sampler2D colorTexture;
uniform sampler2D blurTexture;

uniform float blurBrightness;

in vec2 fragTexCoords;

out vec4 color;

void main() {
    vec3 result = texture(colorTexture, fragTexCoords).rgb + blurBrightness * texture(blurTexture, fragTexCoords).rgb;
    color = vec4(pow(result, vec3(1.0 / 2.2)), 1.0);
}
`;

/** @type {HTMLCanvasElement} */
let canvas = null;

/** @type {WebGL2RenderingContext} */
let context = null;

/** @type {number} */
let prevTimestamp = null;

/** @type {ShaderProgram} */
let sceneShaderProgram = null;

/** @type {ShaderProgram} */
let screenShaderProgram = null;

/** @type {ShaderProgram} */
let fontShaderProgram = null;

/** @type {ShaderProgram} */
let blurShaderProgram = null;

/** @type {Object.<string, Texture>} */
const textures = {};

/** @type {Font} */
let font = null;

/** @type {Renderer} */
let renderer = null;

/** @type {SpriteBatch} */
let spriteBatch = null;

/** @type {Framebuffer} */
let framebufferMultisample = null;

/** @type {Framebuffer} */
let framebuffer = null;

/** @type {Framebuffer} */
let pingFramebuffer = null;

/** @type {Framebuffer} */
let pongFramebuffer = null;

/** @type {AudioSystem} */
let audioSystem = null;

/** @type {Player} */
let player = null;

/** @type {GameObject[]} */
let gameObjects = [player = new Player()];

/** @type {AudioBuffer[]} */
let impactSounds = [];

let nextImpactSound = 0;

function playImpactSound() {
    if (audioSystem === null || impactSounds.length === 0) return;

    audioSystem.play(impactSounds[nextImpactSound % impactSounds.length]);
    nextImpactSound++;
}

/** @type {AudioBuffer[]} */
let digSounds = [];

let nextDigSound = 0;

function playDigSound() {
    if (audioSystem === null || digSounds.length === 0) return;

    audioSystem.play(digSounds[nextDigSound % digSounds.length]);
    nextDigSound++;
}

async function loadText(url) {
    const response = await fetch(url);
    return response.text();
}

async function loadBinary(url) {
    const response = await fetch(url);
    return response.arrayBuffer();
}

function loadImage(url) {
    return new Promise(resolve => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.loading = 'eager';
        image.src = url;
    });
}

async function loadAudio(url) {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return audioSystem.context.decodeAudioData(buffer);
}

function resize() {
    const { clientWidth, clientHeight } = canvas;

    canvas.width = clientWidth;
    canvas.height = clientHeight;

    renderer.resize(clientWidth, clientHeight);
    framebufferMultisample.resize(clientWidth, clientHeight).attachRenderbuffer(new Renderbuffer(context, clientWidth, clientHeight));
    framebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
    pingFramebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
    pongFramebuffer.resize(clientWidth, clientHeight).attachTexture(new Texture(context, context.TEXTURE_2D, clientWidth, clientHeight));
}

const keys = {};

function isKeyDown(code) {
    return code in keys && keys[code] === true;
}

function isKeyUp(code) {
    return !(code in keys) || keys[code] === false;
}

async function main() {
    canvas = document.getElementById('canvas');
    if (canvas === null) return console.error('#canvas not found');

    context = canvas.getContext('webgl2', { antialias: false });
    if (context === null) return console.error("Can't create webgl context");

    sceneShaderProgram = new ShaderProgram(context, SCENE_VERTEX_SHADER_SOURCE, SCENE_FRAGMENT_SHADER_SOURCE);
    screenShaderProgram = new ShaderProgram(context, SCREEN_VERTEX_SHADER_SOURCE, SCREEN_FRAGMENT_SHADER_SOURCE);
    fontShaderProgram = new ShaderProgram(context, FONT_VERTEX_SHADER_SOURCE, FONT_FRAGMENT_SHADER_SOURCE);
    blurShaderProgram = new ShaderProgram(context, BLUR_VERTEX_SHADER_SOURCE, BLUR_FRAGMENT_SHADER_SOURCE);

    renderer = new Renderer(context, canvas.width, canvas.height);
    spriteBatch = new SpriteBatch(renderer);
    framebufferMultisample = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
    framebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
    pingFramebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);
    pongFramebuffer = new Framebuffer(context, canvas.clientWidth, canvas.clientHeight);

    await Promise.all([
        ...['white', 'tile_dirt', 'tile_stone', 'tile_sand', 'tile_block', 'player',
        ].map(name => loadImage(`./assets/${name}.png`).then(image => textures[name] = new Texture(context, context.TEXTURE_2D, image.width, image.height, context.SRGB8_ALPHA8).setImage(image).setParameter(context.TEXTURE_MAG_FILTER, context.NEAREST))),
        loadImage('./assets/font.png').then(image => textures['font'] = new Texture(context, context.TEXTURE_2D, image.width, image.height, context.RGBA8).setImage(image)),
        loadBinary('./assets/font.bin').then(fontData => font = new Font().deserializeData(fontData)),
    ]);

    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('pointerdown', event => event.preventDefault());
    document.addEventListener('pointermove', event => event.preventDefault());
    document.addEventListener('pointerup', event => event.preventDefault());

    document.addEventListener('click', event => {
        event.preventDefault();

        if (audioSystem === null) {
            audioSystem = new AudioSystem();
            audioSystem.resume();

            loadAudio('./assets/bgm.mp3').then(buffer => audioSystem.play(buffer, true));

            Promise.all([
                loadAudio('./assets/footstep_carpet_000.mp3'),
                loadAudio('./assets/footstep_carpet_001.mp3'),
                loadAudio('./assets/footstep_carpet_002.mp3'),
                loadAudio('./assets/footstep_carpet_003.mp3'),
                loadAudio('./assets/footstep_carpet_004.mp3'),
            ]).then(result => impactSounds = result);

            Promise.all([
                loadAudio('./assets/footstep_concrete_000.mp3'),
                loadAudio('./assets/footstep_concrete_001.mp3'),
                loadAudio('./assets/footstep_concrete_002.mp3'),
                loadAudio('./assets/footstep_concrete_003.mp3'),
                loadAudio('./assets/footstep_concrete_004.mp3'),
            ]).then(result => digSounds = result);
        }
    });

    document.addEventListener('keydown', event => keys[event.code] = true);
    document.addEventListener('keyup', event => keys[event.code] = false);

    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(update);
}

const MAX_DELTA_TIME = 1000 / 30;

let viewOffsetY = 0;

function update(timestamp) {
    requestAnimationFrame(update);

    const deltaTime = Math.min((prevTimestamp !== null) ? timestamp - prevTimestamp : 0, MAX_DELTA_TIME);
    prevTimestamp = timestamp;

    for (const gameObject of gameObjects)
        gameObject.update(deltaTime);

    if (objectDeleteQueue.size > 0) {
        gameObjects = gameObjects.filter(gameObject => !objectDeleteQueue.has(gameObject));
        objectDeleteQueue.clear();
    }

    framebufferMultisample.bind();
    renderer.clear(Math.pow(0.63, 2.2), Math.pow(0.88, 2.2), Math.pow(0.98, 2.2), 1);
    sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);

    // Draw scene

    spriteBatch.begin();

    for (const gameObject of gameObjects)
        gameObject.draw();

    for (let i = 0; i < tiles.length; i++) {
        const tileTypeId = tiles[i];
        if (tileTypeId === 0) continue;

        const x = i % TILES_COLUMNS;
        const y = Math.floor(i / TILES_COLUMNS);

        const tileType = TILE_TYPES[tileTypeId];
        const textureName = tileType.texture;
        const texture = textures[textureName];

        if (breakingTileX === x && breakingTileY === y) {
            spriteBatch.drawRectangle(texture, x * TILE_SIZE, (y - viewOffsetY) * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, 1, 1, 1 - breakingTileProgress, 1 - breakingTileProgress, 1 - breakingTileProgress, 1 - breakingTileProgress * breakingTileProgress);
        } else {
            spriteBatch.drawRectangle(texture, x * TILE_SIZE, (y - viewOffsetY) * TILE_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, 1, 1, 1, 1, 1, 1);
        }
    }

    spriteBatch.end();

    framebufferMultisample.unbind();
    framebufferMultisample.blit(framebuffer);
    framebufferMultisample.bind();
    renderer.clear(0, 0, 0, 0);
    sceneShaderProgram.bind().setUniformMatrix('matrix', renderer.matrix);

    // Draw bloom objects

    spriteBatch.begin();

    for (const gameObject of gameObjects)
        if (gameObject.objectType === 'TileEntity')
            gameObject.draw();

    spriteBatch.end();

    framebufferMultisample.unbind();
    framebufferMultisample.blit(pongFramebuffer);

    for (let i = 0; i < 4; i++) {
        blurShaderProgram.bind().setUniform('horizontal', true);
        pingFramebuffer.bind();
        pongFramebuffer.attachment.bind();
        renderer.beginGeometry();
        renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
        renderer.endGeometry();
        pingFramebuffer.unbind();

        blurShaderProgram.bind().setUniform('horizontal', false);
        pongFramebuffer.bind();
        pingFramebuffer.attachment.bind();
        renderer.beginGeometry();
        renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
        renderer.endGeometry();
        pongFramebuffer.unbind();
    }

    context.viewport(0, 0, renderer.width, renderer.height);
    screenShaderProgram.bind().setUniformInteger('blurTexture', 1).setUniform('blurBrightness', (Math.sin(8 * timestamp / 1000) + 1) / 2);
    framebuffer.attachment.bind();
    pongFramebuffer.attachment.bind(1);
    renderer.beginGeometry();
    renderer.drawRectangleOffCenter(0, 0, 2, 2, 0, 0, 1, 1, 1, 1, 1, 1);
    renderer.endGeometry();
}

(document.readyState === 'loading') ? document.addEventListener('DOMContentLoaded', main) : main();
