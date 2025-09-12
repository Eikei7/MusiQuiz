import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true, // This is the key setting
    // Or alternatively, you can use:
    // historyApiFallback: {
    //   index: '/index.html'
    // }
  }
})