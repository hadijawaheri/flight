#!/usr/bin/env bash
# One-shot step of docker-compose.prod.yml: makes the replica set primary and creates the API's own
# database user, which can read and write only the flysmart database (never the root account).
set -euo pipefail

mongosh --quiet --host mongo -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin <<JS
try { rs.status() } catch (e) { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongo:27017" }] }) }
for (let i = 0; i < 60 && !db.hello().isWritablePrimary; i++) sleep(1000)
const app = db.getSiblingDB("flysmart")
if (!app.getUser("$MONGO_APP_USER")) {
  app.createUser({ user: "$MONGO_APP_USER", pwd: "$MONGO_APP_PASSWORD", roles: [{ role: "readWrite", db: "flysmart" }] })
  print("created user $MONGO_APP_USER")
}
JS
