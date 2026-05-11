import { defineConfig } from 'vite'
import path from 'path'

const srcRoot = path.resolve(__dirname, '..', 'src')

export default defineConfig({
  root: __dirname,
  server: {
    port: 5180,
    strictPort: true,
  },
  resolve: {
    alias: {
      utils: path.join(srcRoot, 'utils'),
      types: path.join(srcRoot, 'types'),
      styles: path.join(srcRoot, 'styles'),
      core: path.join(srcRoot, 'core'),
      components: path.join(srcRoot, 'components'),
      containers: path.join(srcRoot, 'containers'),
      'data-models': path.join(srcRoot, 'data-models'),
    },
  },
})
