/** Local-only Next build/start. Never deploys; never edits .env files.
 * Uses dummy configuration; build permits only HTTPS GETs for Google Fonts.
 * Start blocks all outgoing Node TCP/TLS/fetch traffic.
 * Run only after stopping this checkout's dev server: both use .next.
 */
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const mode = args[0] || 'build'
if (!['build', 'start'].includes(mode)) throw new Error('Usage: node scripts/cruise-pass5-isolated-build.mjs [build|start] [port]')
const port = args[1] || '3041'
if (!/^\d+$/.test(port) || +port < 1024 || +port > 65535 || args.length > 2) throw new Error('Invalid local port or extra arguments')

// Inherit operating-system necessities only, not the caller's service credentials.
const env = {}
const systemNames = new Set(['path', 'pathext', 'systemroot', 'windir', 'comspec', 'temp', 'tmp', 'userprofile', 'homedrive', 'homepath', 'appdata', 'localappdata', 'programfiles', 'programfiles(x86)', 'programdata', 'systemdrive', 'number_of_processors', 'processor_architecture'])
for (const [name, value] of Object.entries(process.env)) if (systemNames.has(name.toLowerCase()) && value !== undefined) env[name] = value

// Extract names only. Never print, serialize or copy source values.
const configNames = new Set()
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.startsWith('.env')) continue
  const source = readFileSync(join(root, entry.name), 'utf8')
  for (const match of source.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) configNames.add(match[1])
}
// Cover undeclared inputs too; future source additions cannot inherit credentials.
for (const name of configNames) env[name] = ''
Object.assign(env, {
  NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:9',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-local-dummy',
  SUPABASE_SERVICE_ROLE_KEY: 'isolated-local-dummy',
  NEXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
  NEXT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${port}`,
  NEXT_PUBLIC_CRUISE_AVENUE: 'hidden', CRUISE_PLOTS_ENABLED: '0',
  STRIPE_SECRET_KEY: 'sk_test_isolated_no_network', STRIPE_WEBHOOK_SECRET: '',
  STUDIO_PASSWORD: '', CRUISE_DRIVEBY_SALT: 'isolated-local-dummy',
  ANTHROPIC_API_KEY: '', CLOUDFLARE_API_TOKEN: '', RESEND_API_KEY: '',
  TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '', CRON_SECRET: '',
  NEXT_PUBLIC_GA_MEASUREMENT_ID: '', NEXT_PUBLIC_CLARITY_PROJECT_ID: '',
  OLLAMA_HOST: 'http://127.0.0.1:9', OLLAMA_URL: 'http://127.0.0.1:9',
})

const guardDirectory = mkdtempSync(join(tmpdir(), 'cruise-pass5-offline-'))
const guardPath = join(guardDirectory, 'deny-outbound.cjs')
writeFileSync(guardPath, `
const net = require('node:net');
const tls = require('node:tls');
const http = require('node:http');
const https = require('node:https');
const { AsyncLocalStorage } = require('node:async_hooks');
const { syncBuiltinESMExports } = require('node:module');
const denied = () => { const e = new Error('PASS5_ISOLATED_OUTBOUND_DISABLED'); e.code = 'ENETUNREACH'; return e; };
const fontContext = new AsyncLocalStorage();
const allowFonts = ${JSON.stringify(mode === 'build')};
const hosts = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);
const validHost = host => typeof host === 'string' && hosts.has(host.toLowerCase());
const fontRequest = (input, options = {}) => {
  const base = typeof input === 'string' || input instanceof URL ? new URL(input) : input;
  const method = String(options.method || base.method || 'GET').toUpperCase();
  const protocol = options.protocol || base.protocol || 'https:';
  const hostname = options.hostname || options.host || base.hostname || base.host;
  const port = options.port || base.port || '443';
  if (!allowFonts || method !== 'GET' || protocol !== 'https:' || !validHost(hostname) || String(port) !== '443') throw denied();
};
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const target = Array.isArray(args[0]) ? args[0][0] : args[0];
  // Permit local IPC pipes for Next worker coordination, never TCP ports.
  const ipcPath = typeof target === 'string' ? target : target && typeof target === 'object' && !target.port ? target.path : null;
  const windowsPipePrefix = String.fromCharCode(92, 92, 46, 92) + 'pipe' + String.fromCharCode(92);
  const localIpc = typeof ipcPath === 'string' && (process.platform === 'win32' ? ipcPath.toLowerCase().startsWith(windowsPipePrefix) : ipcPath.startsWith('/'));
  if (localIpc) return connect.apply(this, args);
  const tcp = target && typeof target === 'object' ? target : { port: target, host: args[1] };
  if (allowFonts && fontContext.getStore() && validHost(tcp.host || tcp.hostname) && Number(tcp.port) === 443) return connect.apply(this, args);
  throw denied();
};
const tlsConnect = tls.connect;
tls.connect = function (...args) {
  const target = args[0] && typeof args[0] === 'object' ? args[0] : { port: args[0], host: args[1] };
  if (!allowFonts || !fontContext.getStore() || !validHost(target.host || target.hostname || target.servername) || Number(target.port || 443) !== 443) throw denied();
  return tlsConnect.apply(this, args);
};
http.request = http.get = () => { throw denied(); };
for (const method of ['request', 'get']) {
  const original = https[method];
  https[method] = function (input, options, callback) {
    fontRequest(input, typeof options === 'object' ? options : {});
    return fontContext.run(true, () => original.call(this, input, options, callback));
  };
}
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options = {}) => {
  try { fontRequest(typeof input === 'object' && input.url ? input.url : input, { ...options, method: options.method || input.method || 'GET' }); }
  catch (error) { return Promise.reject(error); }
  return fontContext.run(true, () => originalFetch(input, { ...options, redirect: 'error' }));
};
syncBuiltinESMExports();
`, 'utf8')
env.NODE_OPTIONS = `--require "${guardPath.replaceAll('\\', '/')}"`

console.log(`Isolated Next ${mode}: ${configNames.size} local configuration names overridden; ${mode === 'build' ? 'Google Fonts HTTPS GET only' : 'outgoing Node network disabled'}; .env files untouched.`)
const next = join(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [next, mode, ...(mode === 'start' ? ['--hostname', '127.0.0.1', '--port', port] : [])], { cwd: root, env, stdio: 'inherit', windowsHide: true })
const cleanup = () => { try { unlinkSync(guardPath); rmdirSync(guardDirectory) } catch { /* Preserve original exit result. */ } }
child.on('error', error => { console.error(`Isolated child failed: ${error.code || error.name}`); cleanup(); process.exitCode = 1 })
child.on('exit', (code, signal) => { cleanup(); process.exitCode = code ?? (signal ? 1 : 0) })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
