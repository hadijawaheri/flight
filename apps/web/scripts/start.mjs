// `PORT=7782 node …` is POSIX-only; setting the env here works the same on Windows
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.PORT ??= "7782";
const server = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".next",
  "standalone",
  "apps",
  "web",
  "server.js",
);
await import(pathToFileURL(server).href);
