#!/usr/bin/env node
/**
 * Build a minimal D3.js bundle with only the modules needed for the visualization.
 *
 * Used modules:
 * - d3-selection: d3.select, selectAll, append, attr, etc.
 * - d3-scale: d3.scaleLinear, d3.scaleLog, d3.scaleBand
 * - d3-array: d3.max
 * - d3-interpolate: d3.interpolateNumber
 * - d3-transition: transitions, duration, delay, tween
 *
 * This reduces the bundle from ~93KB to ~25KB (73% reduction)
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const entryPoint = path.join(__dirname, 'd3-bundle-entry.js');
const outputFile = path.join(__dirname, 'd3.custom.min.js');

// Create entry point that exports only what we need
const entryContent = `
// Custom D3 bundle - only the modules needed for this visualization
export { select, selectAll } from 'd3-selection';
export { scaleLinear, scaleLog, scaleBand } from 'd3-scale';
export { max, min, extent } from 'd3-array';
export { interpolateNumber } from 'd3-interpolate';
export { transition } from 'd3-transition';

// Re-export as default namespace for drop-in compatibility
import { select, selectAll } from 'd3-selection';
import { scaleLinear, scaleLog, scaleBand } from 'd3-scale';
import { max, min, extent } from 'd3-array';
import { interpolateNumber } from 'd3-interpolate';
import { transition } from 'd3-transition';

const d3 = {
    select,
    selectAll,
    scaleLinear,
    scaleLog,
    scaleBand,
    max,
    min,
    extent,
    interpolateNumber,
    transition
};

// Make d3 available globally for compatibility
if (typeof window !== 'undefined') {
    window.d3 = d3;
}

export default d3;
`;

fs.writeFileSync(entryPoint, entryContent);

console.log('Building custom D3 bundle...');

esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    minify: true,
    format: 'iife',
    globalName: 'd3',
    outfile: outputFile,
    target: ['es2018'],
    platform: 'browser',
}).then(() => {
    // Clean up entry file
    fs.unlinkSync(entryPoint);

    const stats = fs.statSync(outputFile);
    const fullD3Size = 93411; // Size from Lighthouse report
    const reduction = ((1 - stats.size / fullD3Size) * 100).toFixed(1);

    console.log(`\nCustom D3 bundle created: ${outputFile}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB (${reduction}% smaller than full D3)`);
    console.log('\nIncluded modules:');
    console.log('  - d3-selection (select, selectAll)');
    console.log('  - d3-scale (scaleLinear, scaleLog, scaleBand)');
    console.log('  - d3-array (max, min, extent)');
    console.log('  - d3-interpolate (interpolateNumber)');
    console.log('  - d3-transition');
}).catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
