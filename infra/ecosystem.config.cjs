// Run from the repo root: pm2 startOrReload infra/ecosystem.config.cjs --update-env
const path = require("node:path");

const root = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "flysmart-api",
      cwd: path.join(root, "apps/api"), // the API reads its secrets from apps/api/.env
      script: "dist/main.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 7791,
        HOST: "127.0.0.1",
        // ALLOW_DEV_AUTH lives in apps/api/.env: values here would override it and could
        // never be switched off without editing the repo
      },
      max_memory_restart: "512M",
      kill_timeout: 10_000,
      autorestart: true,
      time: true,
    },
    {
      name: "flysmart-web",
      cwd: path.join(root, "apps/web"),
      script: ".next/standalone/apps/web/server.js",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "7792",
        HOSTNAME: "127.0.0.1",
        INTERNAL_API_URL: "http://127.0.0.1:7791",
      },
      max_memory_restart: "768M",
      kill_timeout: 10_000,
      autorestart: true,
      time: true,
    },
  ],
};
