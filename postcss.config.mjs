import path from "node:path";
import { fileURLToPath } from "node:url";

/** Always this app folder — never rely on `process.cwd()` (often `…\Rajco` when the IDE opens the parent). */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: appRoot,
    },
  },
};

export default config;
