import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import * as esbuild from 'esbuild';
import { dest, parallel, src } from 'gulp';
import postcss from 'gulp-postcss';
import rename from 'gulp-rename';

import fs from 'node:fs/promises';

import { Font } from './src/js/graphics.js';

function jsTask() {
    return esbuild.build({
        entryPoints: ['./src/js/index.js'],
        outfile: './dist/index.min.js',
        target: 'es2020',
        bundle: true,
        minify: true,
        sourcemap: true,
    });
}

function cssTask() {
    return src('./src/css/**/*.css')
        .pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(rename({ extname: '.min.css' }))
        .pipe(dest('./dist/'));
}

async function fontTask() {
    const csvData = await fs.readFile('./src/assets/font.csv', 'utf8');
    const font = new Font().deserializeDataFromCSV(csvData, 1024, 1024);
    const data = font.serializeData();
    const buffer = Buffer.alloc(data.length * 4);
    for (let i = 0; i < data.length; i++) {
        buffer.writeFloatLE(data[i], i * 4);
    }

    await fs.writeFile('./assets/font.bin', buffer);
}

const defaultTask = parallel(jsTask, cssTask, fontTask);

export default defaultTask;
