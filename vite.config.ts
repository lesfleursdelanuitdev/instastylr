import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static build, no backend. `npm run build` emits a self-contained dist/.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
