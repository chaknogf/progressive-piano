import { defineConfig } from 'astro/config';

// El sitio es 100% estático: Vercel lo detecta y publica `dist/` sin configuración extra.
export default defineConfig({
  output: 'static',
  site: 'https://progressive-music.vercel.app',
});
