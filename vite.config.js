import { defineConfig } from 'vite';

export default defineConfig({
  // Caminhos relativos no build final, para funcionar em qualquer
  // subpasta de hospedagem (ex: GitHub Pages, subdiretórios etc).
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
});
