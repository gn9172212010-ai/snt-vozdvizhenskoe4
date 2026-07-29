import { defineConfig } from 'astro/config';

export default defineConfig({
  // Отключаем панель разработчика, чтобы она не пыталась искаться по кириллическому пути
  devToolbar: {
    enabled: false
  }
});