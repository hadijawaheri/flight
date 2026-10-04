import fs from "node:fs";
import path from "node:path";

const srcStatic = ".next/static";
const destStatic = ".next/standalone/apps/web/.next/static";

if (fs.existsSync(srcStatic)) {
  fs.mkdirSync(path.dirname(destStatic), { recursive: true });
  fs.cpSync(srcStatic, destStatic, { recursive: true });
}

const srcPublic = "public";
const destPublic = ".next/standalone/apps/web/public";

if (fs.existsSync(srcPublic)) {
  fs.mkdirSync(path.dirname(destPublic), { recursive: true });
  fs.cpSync(srcPublic, destPublic, { recursive: true });
}
