import fs from "node:fs";

import { Client } from "ssh2";

const host = process.env.SERVER_HOST || "141.11.107.22";
const port = Number(process.env.SERVER_PORT || 9011);
const username = process.env.SERVER_USER || "root";
const password = process.env.SERVER_PASS;
const defaultKeyPath =
  "C:\\Users\\tech\\.gemini\\antigravity\\brain\\b089cf3f-039b-48b9-89cf-4d6d9b42ca82\\scratch\\deploy_key";
const privateKeyPath =
  process.env.SERVER_KEY || (fs.existsSync(defaultKeyPath) ? defaultKeyPath : null);

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
