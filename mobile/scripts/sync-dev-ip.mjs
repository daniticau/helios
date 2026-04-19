#!/usr/bin/env node
// Resolve the current Tailscale/LAN IPv4 and write it into mobile/.env
// as EXPO_PUBLIC_API_BASE_URL. Run before `expo start --dev-client` (or
// via `npm run dev`) so the phone always hits the dev backend at the
// right IP, even after a network change.
//
// Order of preference:
//   1. Tailscale IPv4 (100.x.x.x), via `tailscale ip -4` if the CLI is
//      installed. Same IP works for phone + laptop when both are on
//      Tailscale, which is the setup we've been running against.
//   2. First non-internal IPv4 in a private range (10/8, 172.16/12,
//      192.168/16). Falls back to this when Tailscale isn't present.
//
// No flags — just run it. Prints the URL it wrote.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env');
const KEY = 'EXPO_PUBLIC_API_BASE_URL';
const BACKEND_PORT = 8000;

function tailscaleIp() {
  try {
    const out = execSync('tailscale ip -4', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const ip = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find((line) => /^100\.\d+\.\d+\.\d+$/.test(line));
    return ip ?? null;
  } catch {
    return null;
  }
}

const PRIVATE_RANGE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;

function lanIp() {
  const ifaces = networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const ifc of list ?? []) {
      if (ifc.family !== 'IPv4' || ifc.internal) continue;
      if (PRIVATE_RANGE.test(ifc.address)) return ifc.address;
    }
  }
  return null;
}

function pickIp() {
  return tailscaleIp() ?? lanIp();
}

function upsertEnv(url) {
  const line = `${KEY}=${url}`;
  let env = '';
  try {
    env = readFileSync(ENV_PATH, 'utf8');
  } catch {
    env = '';
  }
  const keyRe = new RegExp(`^${KEY}=.*$`, 'm');
  const next = keyRe.test(env)
    ? env.replace(keyRe, line)
    : (env.trimEnd() ? env.trimEnd() + '\n' : '') + line + '\n';
  if (next !== env) writeFileSync(ENV_PATH, next);
}

const ip = pickIp();
if (!ip) {
  console.error(
    'sync-dev-ip: no Tailscale or LAN IPv4 found — set EXPO_PUBLIC_API_BASE_URL manually in mobile/.env'
  );
  process.exit(1);
}
const url = `http://${ip}:${BACKEND_PORT}`;
upsertEnv(url);
console.log(`sync-dev-ip: ${KEY}=${url}`);
