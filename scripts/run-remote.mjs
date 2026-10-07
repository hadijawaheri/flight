import fs from "node:fs";

import { Client } from "ssh2";

// Server details come from the environment so none of them is committed
const host = process.env.SERVER_HOST;
if (!host) {
  console.error("Set SERVER_HOST (and SERVER_PORT, SERVER_USER, SERVER_KEY or SERVER_PASS).");
  process.exit(1);
}
const port = Number(process.env.SERVER_PORT || 22);
const username = process.env.SERVER_USER || "root";
const password = process.env.SERVER_PASS;
const privateKeyPath = process.env.SERVER_KEY || null;

const command = process.argv.slice(2).join(" ");

if (!command) {
  console.error("Usage: node scripts/run-remote.mjs <command>");
  process.exit(1);
}

function runWithAuth(auth) {
  const conn = new Client();
  conn
    .on("ready", () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          console.error("Exec error:", err);
          conn.end();
          process.exit(1);
        }

        stream.on("close", (code) => {
          conn.end();
          process.exit(code || 0);
        });

        stream.on("data", (data) => {
          process.stdout.write(data);
        });

        stream.stderr.on("data", (data) => {
          process.stderr.write(data);
        });
      });
    })
    .on("error", (err) => {
      if (auth.privateKey && password) {
        console.log("Key auth failed, falling back to password...");
        runWithAuth({ host, port, username, password, readyTimeout: 30000 });
      } else {
        console.error("Connection error:", err.message);
        process.exit(1);
      }
    })
    .connect(auth);
}

if (privateKeyPath && fs.existsSync(privateKeyPath)) {
  runWithAuth({
    host,
    port,
    username,
    privateKey: fs.readFileSync(privateKeyPath),
    readyTimeout: 30000,
  });
} else {
  runWithAuth({
    host,
    port,
    username,
    password,
    readyTimeout: 30000,
  });
}
