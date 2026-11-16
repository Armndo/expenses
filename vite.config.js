import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  // The tests are of the pure functions of `src/utils/functions`: no browser, so no `jsdom`.
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
})
