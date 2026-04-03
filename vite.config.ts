import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [
    sveltekit(),
    {
      name: "edupro-worker-full-reload",
      handleHotUpdate({ file, server }) {
        if (
          /\/src\/lib\/worker\/|\/src\/lib\/runtime\/worker-client\.ts$|\/src\/lib\/domain\/edupro-core\.js$/.test(
            file,
          )
        ) {
          server.ws.send({ type: "full-reload" });
          return [];
        }
      },
    },
  ],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
});
