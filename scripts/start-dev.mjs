import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const apiRequire = createRequire(new URL("../apps/api/package.json", import.meta.url));
const { MongoMemoryReplSet } = apiRequire("mongodb-memory-server");

console.log("==================================================");
console.log("🚀 Starting FlySmart (پرواز پلاس) Full Environment");
console.log("==================================================");

console.log("[1/3] Starting embedded MongoDB replica set (port 27018)...");
const replSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: "rs0", storageEngine: "wiredTiger" },
  instanceOpts: [{ port: 27018 }],
});
console.log("✅ MongoDB ready at:", replSet.getUri("flysmart"));

console.log("[2/3] Starting NestJS API (http://localhost:7781)...");
const apiProcess = spawn(process.execPath, ["--env-file=apps/api/.env", "apps/api/dist/main.js"], {
  stdio: "inherit",
});

console.log("[3/3] Starting Next.js Web App (http://localhost:7782)...");
const nextBin = path.resolve("apps/web/node_modules/next/dist/bin/next");
const webProcess = spawn(process.execPath, [nextBin, "dev", "-p", "7782"], {
  cwd: "apps/web",
  stdio: "inherit",
});

const cleanup = async () => {
  console.log("Stopping FlySmart processes...");
  try {
    apiProcess.kill();
  } catch {
    // ignore
  }
  try {
    webProcess.kill();
  } catch {
    // ignore
  }
  try {
    await replSet.stop();
  } catch {
    // ignore
  }
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
