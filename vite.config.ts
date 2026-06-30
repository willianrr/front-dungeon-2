import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    open: true,
    allowedHosts: ['.loca.lt', '.trycloudflare.com', 'front-dungeon-2-c20f95b9.mithrill.com.br'],
  },
  preview: {
    allowedHosts: ['.loca.lt', '.trycloudflare.com', 'front-dungeon-2-c20f95b9.mithrill.com.br'],
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/playcanvas')) return 'playcanvas';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
});
