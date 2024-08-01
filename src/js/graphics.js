export class Renderbuffer {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} width
     * @param {number} height
     */
    constructor(context, width, height) {
        const handle = context.createRenderbuffer();
        context.bindRenderbuffer(context.RENDERBUFFER, handle);
        context.renderbufferStorageMultisample(context.RENDERBUFFER, context.getParameter(context.MAX_SAMPLES), context.RGBA8, width, height);

        this.context = context;
        this.handle = handle;
        this.width = width;
        this.height = height;
    }

    bind() {
        const { context, handle } = this;

        context.bindRenderbuffer(context.RENDERBUFFER, handle);

        return this;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteRenderbuffer(handle);
            this.handle = null;
        }
    }
}

export class Framebuffer {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} width
     * @param {number} height
     */
    constructor(context, width, height) {
        const handle = context.createFramebuffer();
        context.bindFramebuffer(context.FRAMEBUFFER, handle);

        context.viewport(0, 0, width, height);

        context.bindFramebuffer(context.FRAMEBUFFER, null);

        this.context = context;
        this.handle = handle;
        this.width = width;
        this.height = height;
    }

    attachTexture(texture) {
        const { context, attachment } = this;

        this.bind();

        texture.bind();
        context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, texture.handle, 0);
        this.attachment = texture;

        this.unbind();

        attachment?.delete();

        return this;
    }

    attachRenderbuffer(renderbuffer) {
        const { context, attachment } = this;

        this.bind();

        renderbuffer.bind();
        context.framebufferRenderbuffer(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.RENDERBUFFER, renderbuffer.handle);
        this.attachment = renderbuffer;

        this.unbind();

        attachment?.delete();

        return this;
    }

    resize(width, height) {
        const { context } = this;

        this.bind();

        context.viewport(0, 0, width, height);

        this.unbind();

        this.width = width;
        this.height = height;

        return this;
    }

    bind() {
        const { context, handle } = this;

        context.bindFramebuffer(context.FRAMEBUFFER, handle);

        return this;
    }

    unbind() {
        const { context } = this;

        context.bindFramebuffer(context.FRAMEBUFFER, null);

        return this;
    }

    /**
     * @param {Framebuffer} framebuffer
     */
    blit(framebuffer) {
        const { context, width, height } = this;

        context.bindFramebuffer(context.READ_FRAMEBUFFER, this.handle);
        context.bindFramebuffer(context.DRAW_FRAMEBUFFER, framebuffer.handle);
        context.blitFramebuffer(0, 0, width, height, 0, 0, framebuffer.width, framebuffer.height, context.COLOR_BUFFER_BIT, context.LINEAR);
        context.bindFramebuffer(context.READ_FRAMEBUFFER, null);
        context.bindFramebuffer(context.DRAW_FRAMEBUFFER, null);

        return this;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteFramebuffer(handle);
            this.handle = null;
        }
    }
}

export class Shader {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} type
     * @param {string} source
     */
    constructor(context, type, source) {
        const handle = context.createShader(type);
        context.shaderSource(handle, source);
        context.compileShader(handle);

        if (!context.getShaderParameter(handle, context.COMPILE_STATUS)) {
            throw new Error("Can't compile shader: " + context.getShaderInfoLog(handle));
        }

        this.context = context;
        this.handle = handle;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteShader(handle);
            this.handle = null;
        }
    }
}

export class ShaderProgram {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {string} vertexShaderSource
     * @param {string} fragmentShaderSource
     */
    constructor(context, vertexShaderSource, fragmentShaderSource) {
        const vertexShader = new Shader(context, context.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = new Shader(context, context.FRAGMENT_SHADER, fragmentShaderSource);

        const handle = context.createProgram();
        context.attachShader(handle, vertexShader.handle);
        context.attachShader(handle, fragmentShader.handle);
        context.linkProgram(handle);

        if (!context.getProgramParameter(handle, context.LINK_STATUS)) {
            throw new Error("Can't link shader program: " + context.getProgramInfoLog(handle));
        }

        vertexShader.delete();
        fragmentShader.delete();

        this.context = context;
        this.handle = handle;
        this.uniformLocationCache = {};
    }

    bind() {
        const { context, handle } = this;

        context.useProgram(handle);

        return this;
    }

    getUniformLocation(name) {
        const { context, handle, uniformLocationCache } = this;

        if (name in uniformLocationCache) return uniformLocationCache[name];

        return uniformLocationCache[name] = context.getUniformLocation(handle, name);
    }

    setUniform(name, value) {
        const { context } = this;

        this.bind();

        const location = this.getUniformLocation(name);
        if (typeof value === 'boolean') {
            context.uniform1i(location, value ? 1 : 0);
        } else {
            context.uniform1f(location, value);
        }

        return this;
    }

    setUniformInteger(name, value) {
        const { context } = this;

        this.bind();

        const location = this.getUniformLocation(name);
        context.uniform1i(location, value);

        return this;
    }

    setUniformMatrix(name, value, transpose = false) {
        const { context } = this;

        this.bind();

        const location = this.getUniformLocation(name);
        context.uniformMatrix4fv(location, transpose, value);

        return this;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteProgram(handle);
            this.handle = null;
        }
    }
}

export class Texture {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} type
     * @param {number} width
     * @param {number} height
     */
    constructor(context, type, width, height, internalFormat = context.RGBA8) {
        const handle = context.createTexture();
        context.activeTexture(context.TEXTURE0);
        context.bindTexture(type, handle);

        context.texImage2D(type, 0, internalFormat, width, height, 0, context.RGBA, context.UNSIGNED_BYTE, null);

        context.texParameteri(type, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(type, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.texParameteri(type, context.TEXTURE_WRAP_R, context.CLAMP_TO_EDGE);

        context.texParameteri(type, context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(type, context.TEXTURE_MAG_FILTER, context.LINEAR);

        this.context = context;
        this.handle = handle;
        this.type = type;
    }

    bind(textureUnit = 0) {
        const { context, handle, type } = this;

        context.activeTexture(textureUnit + context.TEXTURE0);
        context.bindTexture(type, handle);

        return this;
    }

    /**
     * @param {HTMLImageElement} image
     */
    setImage(image) {
        const { context, type } = this;

        this.bind();

        context.texSubImage2D(type, 0, 0, 0, context.RGBA, context.UNSIGNED_BYTE, image);
        context.texParameteri(type, context.TEXTURE_MIN_FILTER, context.LINEAR_MIPMAP_LINEAR);
        context.generateMipmap(type);

        return this;
    }

    setParameter(parameter, value) {
        const { context, type } = this;

        this.bind();
        context.texParameteri(type, parameter, value);

        return this;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteTexture(handle);
            this.handle = null;
        }
    }
}

export class Buffer {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} type
     * @param {Float32Array|Uint16Array} data
     */
    constructor(context, type, data, usage = context.STATIC_DRAW) {
        const handle = context.createBuffer();
        context.bindBuffer(type, handle);
        context.bufferData(type, data, usage);

        this.context = context;
        this.handle = handle;
        this.type = type;
        this.usage = usage;
    }

    bind() {
        const { context, handle, type } = this;

        context.bindBuffer(type, handle);

        return this;
    }

    /**
     * @param {Float32Array|Uint16Array} data
     */
    setData(data) {
        const { context, type } = this;

        this.bind();

        context.bufferData(type, data, this.usage);

        return this;
    }

    /**
     * @param {Float32Array|Uint16Array} data
     * @param {number} offset
     * @param {number} count
     */
    setDataRange(data, offset, count) {
        const { context, type } = this;

        this.bind();

        context.bufferSubData(type, offset, data, 0, count);

        return this;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteBuffer(handle);
            this.handle = null;
        }
    }
}

export class VertexAttribute {
    /**
     * @param {number} elements
     * @param {number} type
     * @param {boolean} normalized
     * @param {number} offset
     * @param {number} stride
     */
    constructor(elements, type, normalized, stride, offset) {
        this.elements = elements;
        this.type = type;
        this.normalized = normalized;
        this.stride = stride;
        this.offset = offset;
    }
}

export class VertexArray {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {Buffer} buffer
     * @param {VertexAttribute[]} vertexAttributes
     */
    constructor(context, buffer, vertexAttributes) {
        const handle = context.createVertexArray();
        context.bindVertexArray(handle);
        buffer.bind();

        for (let i = 0; i < vertexAttributes.length; i++) {
            context.enableVertexAttribArray(i);

            const vertexAttribute = vertexAttributes[i];
            context.vertexAttribPointer(i, vertexAttribute.elements, vertexAttribute.type, vertexAttribute.normalized, vertexAttribute.stride, vertexAttribute.offset);
        }

        context.bindVertexArray(null);

        this.context = context;
        this.handle = handle;
    }

    bind() {
        const { context, handle } = this;

        context.bindVertexArray(handle);

        return this;
    }

    unnbind() {
        const { context } = this;

        context.bindVertexArray(null);

        return this;
    }

    /**
     * @param {number} vertexCount
     */
    draw(vertexCount) {
        const { context } = this;

        this.bind();

        context.drawArrays(context.TRIANGLES, 0, vertexCount);

        this.unnbind();

        return this;
    }

    delete() {
        const { context, handle } = this;

        if (handle !== null) {
            context.deleteVertexArray(handle);
            this.handle = null;
        }
    }
}

export class Mesh {
    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} vertexCount
     * @param {VertexAttribute[]} vertexAttributes
     * @param {number} usage
     */
    constructor(context, vertexCount, vertexAttributes, usage = context.STATIC_DRAW) {
        let vertexElements = 0;
        for (const vertexAttribute of vertexAttributes) {
            vertexElements += vertexAttribute.elements;
        }

        const vertexBuffer = new Buffer(context, context.ARRAY_BUFFER, new Float32Array(vertexElements * vertexCount), usage);
        const vertexArray = new VertexArray(context, vertexBuffer, vertexAttributes);

        this.context = context;
        this.vertexCount = vertexCount;
        this.vertexArray = vertexArray;
        this.vertexBuffer = vertexBuffer;
    }

    /**
     * @param {Float32Array|Uint16Array} data
     */
    setData(data) {
        this.vertexBuffer.setData(data);

        return this;
    }

    /**
     * @param {Float32Array|Uint16Array} data
     * @param {number} offset
     * @param {number} count
     */
    setDataRange(data, offset, count) {
        this.vertexBuffer.setDataRange(data, offset, count);

        return this;
    }

    /**
     * @param {number} vertexCount
     */
    draw(vertexCount = null) {
        this.vertexArray.draw(vertexCount || this.vertexCount);

        return this;
    }

    delete() {
        this.vertexArray.delete();
        this.vertexBuffer.delete();
    }
}

export class Font {
    constructor() {
        this.glyphs = {};
    }

    deserializeDataFromCSV(data, atlasWidth, atlasHeight) {
        const lines = data.split('\n');
        for (const line of lines) {
            const values = line.split(',');

            if (values.length !== 10) continue;

            const charCode = Number(values[0]);
            const advance = Number(values[1]);
            const planeLeft = Number(values[2]);
            const planeBottom = 1.0 - Number(values[3]);
            const planeRight = Number(values[4]);
            const planeTop = 1.0 - Number(values[5]);
            const atlasLeft = Number(values[6]) / atlasWidth;
            const atlasBottom = 1.0 - Number(values[7]) / atlasHeight;
            const atlasRight = Number(values[8]) / atlasWidth;
            const atlasTop = 1.0 - Number(values[9]) / atlasHeight;

            this.glyphs[charCode] = { charCode, advance, planeLeft, planeBottom, planeRight, planeTop, atlasLeft, atlasBottom, atlasRight, atlasTop };
        }

        return this;
    }

    deserializeData(data) {
        const buffer = new Float32Array(data);

        let index = 0;
        const count = buffer[index++];

        for (let i = 0; i < count; i++) {
            const charCode = buffer[index++];
            const advance = buffer[index++];
            const planeLeft = buffer[index++];
            const planeBottom = buffer[index++];
            const planeRight = buffer[index++];
            const planeTop = buffer[index++];
            const atlasLeft = buffer[index++];
            const atlasBottom = buffer[index++];
            const atlasRight = buffer[index++];
            const atlasTop = buffer[index++];

            this.glyphs[charCode] = { charCode, advance, planeLeft, planeBottom, planeRight, planeTop, atlasLeft, atlasBottom, atlasRight, atlasTop };
        }

        return this;
    }

    serializeData() {
        const glyphs = Object.values(this.glyphs);
        const data = [glyphs.length];
        for (const glyph of glyphs) {
            const { charCode, advance, planeLeft, planeBottom, planeRight, planeTop, atlasLeft, atlasBottom, atlasRight, atlasTop } = glyph;
            data.push(charCode, advance, planeLeft, planeBottom, planeRight, planeTop, atlasLeft, atlasBottom, atlasRight, atlasTop);
        }

        return new Float32Array(data);
    }
}

export class Renderer {
    MAX_VERTICES = 65535;
    VERTEX_ELEMENTS = 8;

    /**
     * @param {WebGL2RenderingContext} context
     * @param {number} width
     * @param {number} height
     */
    constructor(context, width, height) {
        this.context = context;
        this.vertices = new Float32Array(this.VERTEX_ELEMENTS * this.MAX_VERTICES);
        this.mesh = new Mesh(context, this.MAX_VERTICES, [
            new VertexAttribute(2, context.FLOAT, false, 8 * 4, 0),
            new VertexAttribute(2, context.FLOAT, false, 8 * 4, 2 * 4),
            new VertexAttribute(4, context.FLOAT, false, 8 * 4, 4 * 4),
        ], context.DYNAMIC_DRAW);

        context.enable(context.BLEND);
        context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);

        this.resize(width, height);
    }

    resize(width, height) {
        this.width = width;
        this.height = height;

        this.matrix = this.createOrthographicOffCenter(0, width, height, 0, -1, 1);

        return this;
    }

    createOrthographicOffCenter(left, right, bottom, top, near, far) {
        const leftRight = 1 / (left - right);
        const bottomTop = 1 / (bottom - top);
        const nearFar = 1 / (near - far);

        const scaleX = -2 * leftRight;
        const scaleY = -2 * bottomTop;
        const scaleZ = 2 * nearFar;

        const translateX = (left + right) * leftRight;
        const translateY = (top + bottom) * bottomTop;
        const translateZ = (far + near) * nearFar;

        return [
            scaleX, 0, 0, 0,
            0, scaleY, 0, 0,
            0, 0, scaleZ, 0,
            translateX, translateY, translateZ, 1,
        ];
    }

    clear(r, g, b, a) {
        const { context } = this;

        context.clearColor(r, g, b, a);
        context.clear(context.COLOR_BUFFER_BIT);

        return this;
    }

    beginGeometry() {
        this.vertexCount = 0;

        return this;
    }

    endGeometry() {
        const { VERTEX_ELEMENTS, vertexCount, vertices } = this;

        if (vertexCount === 0) return;

        this.mesh.setDataRange(vertices, 0, VERTEX_ELEMENTS * vertexCount);
        this.mesh.draw(vertexCount);

        return this;
    }

    addVertex(
        _x, _y,
        _u, _v,
        _r, _g, _b, _a
    ) {
        const { VERTEX_ELEMENTS, vertexCount, vertices } = this;

        for (let i = 0; i < VERTEX_ELEMENTS; i++)
            vertices[VERTEX_ELEMENTS * vertexCount + i] = arguments[i];

        this.vertexCount++;

        return this;
    }

    drawTriangle(
        ax, ay, au, av,
        bx, by, bu, bv,
        cx, cy, cu, cv,
        r, g, b, a
    ) {
        const { MAX_VERTICES, vertexCount } = this;

        if (vertexCount + 3 >= MAX_VERTICES) {
            this.endGeometry().beginGeometry();
        }

        return this
            .addVertex(ax, ay, au, av, r, g, b, a)
            .addVertex(bx, by, bu, bv, r, g, b, a)
            .addVertex(cx, cy, cu, cv, r, g, b, a);
    }

    drawQuad(
        ax, ay, au, av,
        bx, by, bu, bv,
        cx, cy, cu, cv,
        dx, dy, du, dv,
        r, g, b, a
    ) {
        return this
            .drawTriangle(
                ax, ay, au, av,
                bx, by, bu, bv,
                cx, cy, cu, cv,
                r, g, b, a
            )
            .drawTriangle(
                ax, ay, au, av,
                cx, cy, cu, cv,
                dx, dy, du, dv,
                r, g, b, a
            );
    }

    drawRectangle(x, y, width, height, u0, v0, u1, v1, r, g, b, a) {
        const ax = x;
        const ay = y;

        const bx = x + width;
        const by = y;

        const cx = x + width;
        const cy = y + height;

        const dx = x;
        const dy = y + height;

        return this.drawQuad(
            ax, ay, u0, v0,
            bx, by, u1, v0,
            cx, cy, u1, v1,
            dx, dy, u0, v1,
            r, g, b, a
        );
    }

    drawRectangleOffCenter(x, y, width, height, u0, v0, u1, v1, r, g, b, a) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        const ax = x - halfWidth;
        const ay = y - halfHeight;

        const bx = x + halfWidth;
        const by = y - halfHeight;

        const cx = x + halfWidth;
        const cy = y + halfHeight;

        const dx = x - halfWidth;
        const dy = y + halfHeight;

        return this.drawQuad(
            ax, ay, u0, v0,
            bx, by, u1, v0,
            cx, cy, u1, v1,
            dx, dy, u0, v1,
            r, g, b, a
        );
    }

    drawRotatedRectangleOffCenter(x, y, width, height, angle, u0, v0, u1, v1, r, g, b, a) {
        const halfWidth = width / 2;
        const halfHeight = height / 2;

        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);

        const ax0 = -halfWidth;
        const ay0 = -halfHeight;

        const bx0 = halfWidth;
        const by0 = -halfHeight;

        const cx0 = halfWidth;
        const cy0 = halfHeight;

        const dx0 = -halfWidth;
        const dy0 = halfHeight;

        const ax = x + cosA * ax0 - sinA * ay0;
        const ay = y + sinA * ax0 + cosA * ay0;

        const bx = x + cosA * bx0 - sinA * by0;
        const by = y + sinA * bx0 + cosA * by0;

        const cx = x + cosA * cx0 - sinA * cy0;
        const cy = y + sinA * cx0 + cosA * cy0;

        const dx = x + cosA * dx0 - sinA * dy0;
        const dy = y + sinA * dx0 + cosA * dy0;

        return this.drawQuad(
            ax, ay, u0, v0,
            bx, by, u1, v0,
            cx, cy, u1, v1,
            dx, dy, u0, v1,
            r, g, b, a
        );
    }

    /**
     * @param {Font} font
     * @param {number} x
     * @param {number} y
     * @param {number} charCode
     * @param {number} size
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    drawChar(font, x, y, charCode, size, r, g, b, a) {
        const glyph = font.glyphs[charCode];
        if (typeof glyph === 'undefined' || glyph === null) {
            return this;
        }

        return this.drawRectangle(
            x + size * glyph.planeLeft,
            y + size * glyph.planeTop,
            size * (glyph.planeRight - glyph.planeLeft),
            size * (glyph.planeBottom - glyph.planeTop),
            glyph.atlasLeft, glyph.atlasTop, glyph.atlasRight, glyph.atlasBottom,
            r, g, b, a
        );
    }

    /**
     * @param {Font} font
     * @param {number} x
     * @param {number} y
     * @param {string} str
     * @param {number} size
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    drawString(font, x, y, str, size, r, g, b, a) {
        let offset = 0;
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const glyph = font.glyphs[charCode];
            if (typeof glyph === 'undefined' || glyph === null) {
                continue;
            }

            this.drawChar(font, x + offset, y, charCode, size, r, g, b, a);
            offset += size * glyph.advance;
        }

        return this;
    }

    /**
     * @param {Font} font
     * @param {number} x
     * @param {number} y
     * @param {number} maxWidth
     * @param {string} str
     * @param {number} size
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    drawStringOffCenter(font, x, y, str, size, r, g, b, a) {
        const width = this.measureString(font, str, size);
        return this.drawString(font, x - width / 2, y, str, size, r, g, b, a);
    }

    /**
     * @param {Font} font
     * @param {string} str
     * @param {number} size
     */
    measureString(font, str, size) {
        let width = 0;
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const glyph = font.glyphs[charCode];
            if (typeof glyph === 'undefined' || glyph === null) {
                continue;
            }

            width += size * glyph.advance;
        }

        return width;
    }

    delete() {
        this.mesh.delete();
    }
}

export class SpriteBatch {
    /**
     * @param {Renderer} renderer
     */
    constructor(renderer) {
        this.renderer = renderer;
        this.buckets = new Map();
    }

    begin() {
        this.buckets.clear();

        return this;
    }

    end() {
        for (const [texture, commands] of this.buckets.entries()) {
            texture.bind();
            this.renderer.beginGeometry();

            for (const { name, args } of commands)
                this.renderer[name](...args);

            this.renderer.endGeometry();
        }

        return this;
    }

    addCommand(texture, name, args) {
        const command = { name, args };

        if (this.buckets.has(texture))
            this.buckets.get(texture).push(command);
        else
            this.buckets.set(texture, [command]);

        return this;
    }

    drawTriangle(
        texture,
        _ax, _ay, _au, _av,
        _bx, _by, _bu, _bv,
        _cx, _cy, _cu, _cv,
        _r, _g, _b, _a
    ) {
        return this.addCommand(texture, 'drawTriangle', [...arguments].slice(1));
    }

    drawQuad(
        texture,
        _ax, _ay, _au, _av,
        _bx, _by, _bu, _bv,
        _cx, _cy, _cu, _cv,
        _dx, _dy, _du, _dv,
        _r, _g, _b, _a
    ) {
        return this.addCommand(texture, 'drawQuad', [...arguments].slice(1));
    }

    drawRectangle(
        texture,
        _x, _y, _width, _height,
        _u0, _v0, _u1, _v1,
        _r, _g, _b, _a) {
        return this.addCommand(texture, 'drawRectangle', [...arguments].slice(1));
    }

    drawRectangleOffCenter(
        texture,
        _x, _y, _width, _height,
        _u0, _v0, _u1, _v1,
        _r, _g, _b, _a
    ) {
        return this.addCommand(texture, 'drawRectangleOffCenter', [...arguments].slice(1));
    }

    drawRotatedRectangleOffCenter(
        texture,
        _x, _y, _width, _height, _angle,
        _u0, _v0, _u1, _v1,
        _r, _g, _b, _a
    ) {
        return this.addCommand(texture, 'drawRotatedRectangleOffCenter', [...arguments].slice(1));
    }

    /**
     * @param {Texture} texture
     * @param {Font} font
     * @param {number} x
     * @param {number} y
     * @param {number} charCode
     * @param {number} size
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    drawChar(texture, _font, _x, _y, _charCode, _size, _r, _g, _b, _a) {
        return this.addCommand(texture, 'drawChar', [...arguments].slice(1));
    }

    /**
     * @param {Texture} texture
     * @param {Font} font
     * @param {number} x
     * @param {number} y
     * @param {string} str
     * @param {number} size
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    drawString(texture, _font, _x, _y, _str, _size, _r, _g, _b, _a) {
        return this.addCommand(texture, 'drawString', [...arguments].slice(1));
    }

    /**
     * @param {Texture} texture
     * @param {Font} font
     * @param {number} x
     * @param {number} y
     * @param {number} maxWidth
     * @param {string} str
     * @param {number} size
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    drawStringOffCenter(texture, _font, _x, _y, _str, _size, _r, _g, _b, _a) {
        return this.addCommand(texture, 'drawStringOffCenter', [...arguments].slice(1));
    }

    /**
     * @param {Font} font
     * @param {string} str
     * @param {number} size
     */
    measureString(font, str, size) {
        return this.renderer.measureString(font, str, size);
    }
}
