import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static build, no backend. `npm run build` emits a self-contained dist/ with
// the landing page at /, the editor at /app/ and the tutorials under /learn/.
const page = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    rollupOptions: {
      input: {
        landing: page("./index.html"),
        app: page("./app/index.html"),
        learn: page("./learn/index.html"),
        learnStyling: page("./learn/styling/index.html"),
        learnLists: page("./learn/lists/index.html"),
        learnDividers: page("./learn/dividers/index.html"),
        learnSaving: page("./learn/saving/index.html"),
      },
    },
  },
});
