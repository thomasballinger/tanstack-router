import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      builder: 'mkdist',
      input: './src/',
      pattern: ['**/*.{ts,tsx}', '!**/template/**'],
    },
  ],
  outDir: './dist',
  clean: true,
  declaration: true,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      target: 'node18',
      minify: false,
    },
  },
})
