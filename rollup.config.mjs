import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const dev = !!process.env.DEV;
const plugins = [resolve(), typescript({ noEmitOnError: !dev }), !dev && terser({ format: { comments: false } })];

export default [
  {
    input: 'src/cabbage-weather-card.ts',
    output: { file: 'dist/cabbage-weather-card.js', format: 'es', sourcemap: dev },
    plugins,
  },
  ...['harness', 'scene-lab'].map((name) => ({
    input: `dev/${name}.ts`,
    output: { file: `dev/build/${name}.js`, format: 'es', sourcemap: true },
    plugins: [resolve(), typescript({ noEmitOnError: false })],
  })),
];
