// Builds only the scene lab, to dev/build/scene-lab-<LAB>.js, so several people can iterate in parallel.
// Usage: LAB=forest npx rollup -c rollup.lab.mjs   → open /dev/scene-lab.html?bundle=forest&scene=forest
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

const lab = process.env.LAB || 'scene-lab';
export default {
  input: 'dev/scene-lab.ts',
  output: { file: `dev/build/scene-lab-${lab}.js`, format: 'es', sourcemap: true },
  plugins: [resolve(), typescript({ noEmitOnError: false, outputToFilesystem: false })],
};
