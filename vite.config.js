import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        // keep the game engine and React in their own long-cacheable chunks
        manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], engine: ['./src/game/engine.js', './src/game/game.js', './src/game/data.js'] },
      },
    },
  },
  server: { port: 5173 },
});
