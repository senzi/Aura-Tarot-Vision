import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    basicSsl() // 注入这个小魔法 w
  ],
  server: {
    host: true, // 等同于 --host
    port: 5173
  }
})
