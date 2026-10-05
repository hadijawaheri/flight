// `output: "standalone"` does not copy static assets; the standalone server expects them beside it.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone", "apps", "web");

if (!existsSync(standalone)) {
  console.error("postbuild: .next/standalone/apps/web not found; run `next build` first.");
  process.exit(1);
}

const copies = [
  [join(root, ".next", "static"), join(standalone, ".next", "static")],
  [join(root, "public"), join(standalone, "public")],
];
for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}
console.log("postbuild: copied static assets into the standalone output.");
