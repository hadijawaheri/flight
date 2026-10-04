import { MongoMemoryReplSet } from "mongodb-memory-server";

let replSet: MongoMemoryReplSet | undefined;

// Needs MONGOMS_SYSTEM_BINARY (local mongod) or network access to download one
export async function setup(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  process.env.MONGO_BASE_URI = replSet.getUri();
}

export async function teardown(): Promise<void> {
  await replSet?.stop();
}
