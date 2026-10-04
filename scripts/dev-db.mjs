import { MongoMemoryReplSet } from "mongodb-memory-server";

console.log("Starting embedded local MongoDB replica set for development...");
try {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: "rs0", storageEngine: "wiredTiger" },
    instanceOpts: [{ port: 27018 }],
  });

  const uri = replSet.getUri("flysmart");
  console.log("=========================================");
  console.log("🚀 MongoDB Replica Set ready!");
  console.log("📍 URI:", uri);
  console.log("=========================================");

  const shutdown = async () => {
    console.log("Stopping MongoDB...");
    await replSet.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (err) {
  console.error("Failed to start embedded MongoDB:", err);
  process.exit(1);
}
