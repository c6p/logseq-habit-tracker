import { defineConfig } from "vite";
import vue from '@vitejs/plugin-vue'

const config = defineConfig({
  base: "",
  build: {
    minify: true,
  },
  plugins: [vue()],
});

export default config;