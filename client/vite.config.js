import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            // REST API routes → FastAPI (port 8000)
            '/auth/google': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            '/auth/me': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            '/auth/logout': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true
            },
            // Socket.IO → Node.js (port 3001)
            '/socket.io': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                ws: true
            }
        }
    }
})

