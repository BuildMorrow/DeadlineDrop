import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { pwaPlugin } from './scripts/pwa.mjs'
export default defineConfig({ base: '/DeadlineDrop/', plugins: [react(), pwaPlugin()] })
