import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 设为相对路径以适应任何子路径部署
  plugins: [
    vue(),
    basicSsl() // 注入这个小魔法 w
  ],
  server: {
    host: true, // 等同于 --host
    port: 5173
  }
})
