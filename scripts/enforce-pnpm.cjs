#!/usr/bin/env node

const ua = process.env.npm_config_user_agent || "";

if (!ua.includes("pnpm")) {
  console.error("\nThis repository uses pnpm workspaces.");
  console.error("Run: pnpm install\n");
  process.exit(1);
}
