import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

const CSS_STUB_PREFIX = '\0vitest-css-stub:'

function stubCssModules(): Plugin {
  return {
    name: 'vitest-css-stub',
    enforce: 'pre',
    resolveId(id) {
      if (id.endsWith('.css')) {
        return `${CSS_STUB_PREFIX}${id}`
      }
    },
    load(id) {
      if (!id.startsWith(CSS_STUB_PREFIX)) {
        return null
      }

      const originalId = id.slice(CSS_STUB_PREFIX.length)

      if (originalId.endsWith('.module.css')) {
        return 'const styles = new Proxy({}, { get: (_, prop) => String(prop) }); export default styles;'
      }

      return 'export default {};'
    },
  }
}

export default defineConfig({
  plugins: [stubCssModules(), react()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./setupTests.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
    passWithNoTests: true,
    css: false,
  },
})
