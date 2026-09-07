import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(projectRoot, "index.html"),
        docs: resolve(projectRoot, "docs/index.html"),
        code: resolve(projectRoot, "code/index.html"),
        about: resolve(projectRoot, "about/index.html"),
        download: resolve(projectRoot, "download/index.html"),
        price: resolve(projectRoot, "price/index.html"),
        privacy: resolve(projectRoot, "privacy/index.html"),
        resume: resolve(projectRoot, "resume/index.html"),
      },
    },
  },
});
