import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Honor PORT so a free port can be assigned instead of colliding on 5173.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
})
