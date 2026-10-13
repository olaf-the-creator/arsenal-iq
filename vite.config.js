import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Served from the /arsenal-iq/ subpath by default. Set VITE_BASE=/ to run
// or build for a root-level host.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [vue()],
    base: env.VITE_BASE || '/arsenal-iq/',
  }
})
