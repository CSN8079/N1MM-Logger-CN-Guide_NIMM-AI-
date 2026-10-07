/* ============================================================
   N1MM Logger+ 中文实践指南 · 本地服务器（自动检测 + 流式代理）
   ------------------------------------------------------------
   - 纯 Node.js 内置模块，无第三方依赖
   - GET  /api/detect  自动检测本机 N1MM 安装/数据/数据库/TQSL
   - GET  /api/health  健康检查
   - POST /api/chat    转发到 DeepSeek /chat/completions（保留 SSE 流）
   - 其余路径：静态文件
   默认地址 http://127.0.0.1:8765/ （只监听本机回环地址）
   需要 Node.js 18+。用法：node server.mjs [--no-open] [--port 8765]
   ============================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { Readable } from 'node:stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const portArgIdx = args.indexOf('--port');
let port = portArgIdx >= 0 ? Number(args[portArgIdx + 1]) : Number(process.env.PORT || 8765);
if (!Number.isFinite(port) || port <= 0) port = 8765;
const UPSTREAM = (process.env.DEEPSEEK_BASE || 'https://api.deepseek.com').replace(/\/+$/, '');

const major = Number((process.versions.node || '0').split('.')[0]);
if (major < 18) {
  console.error('[错误] 需要 Node.js 18 或更高版本，当前为 ' + process.version);
  console.error('请从 https://nodejs.org/ 安装 LTS 版本后重试。');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json'
};

/* ---------------- 通用小工具 ---------------- */
function safeStat(p) { try { return fs.statSync(p); } catch (e) { return null; } }
function isDir(p) { const s = safeStat(p); return !!(s && s.isDirectory()); }
function isFile(p) { const s = safeStat(p); return !!(s && s.isFile()); }
function listDir(p) { try { return fs.readdirSync(p, { withFileTypes: true }); } catch (e) { return []; } }
function safeReadText(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return ''; } }
function displayPath(p) {
  if (!p) return '';
  const home = os.homedir();
  try { if (home && p.toLowerCase().startsWith(home.toLowerCase())) return '~' + p.slice(home.length); } catch (e) {}
  return p;
}
function decodeBuf(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || '');
  try { return new TextDecoder('gbk').decode(b); } catch (e) { return b.toString('utf8'); }
}
function runCapture(cmd, argv) {
  try { return decodeBuf(execFileSync(cmd, argv, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })); }
  catch (e) { return ''; }
}
function expandEnv(s) { return String(s || '').replace(/%([^%]+)%/g, (m, k) => process.env[k] || m); }
function parseIni(text) {
  const out = {}; let sec = '';
  String(text || '').split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith(';') || t.startsWith('#')) return;
    const m = t.match(/^\[(.+)\]$/);
    if (m) { sec = m[1].trim(); out[sec] = out[sec] || {}; return; }
    const kv = t.match(/^([^=]+)=(.*)$/);
    if (kv && sec) out[sec][kv[1].trim()] = kv[2].trim();
  });
  return out;
}

/* ---------------- Windows 注册表 ---------------- */
const REG_ROOTS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
];
function parseRegBlocks(out) {
  const blocks = String(out || '').split(/\r?\n\r?\n/);
  const entries = [];
  for (const b of blocks) {
    const get = key => {
      const re = new RegExp('^\\s*' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+REG_[A-Z_]+\\s+(.*)$', 'mi');
      const m = b.match(re); return m ? m[1].trim() : '';
    };
    const dn = get('DisplayName');
    if (dn) entries.push({ displayName: dn, displayVersion: get('DisplayVersion'), installLocation: get('InstallLocation'), uninstallString: get('UninstallString') });
  }
  return entries;
}
function findUninstall(names) {
  if (process.platform !== 'win32') return [];
  const found = [];
  for (const root of REG_ROOTS) {
    for (const name of names) {
      const out = runCapture('reg.exe', ['query', root, '/s', '/f', name, '/d']);
      if (!out) continue;
      for (const e of parseRegBlocks(out)) {
        if (names.some(n => e.displayName.toLowerCase().includes(n.toLowerCase()))) {
          if (!found.some(x => x.displayName === e.displayName && x.installLocation === e.installLocation)) found.push(e);
        }
      }
    }
  }
  return found;
}
function regValue(root, valueName) {
  if (process.platform !== 'win32') return '';
  const out = runCapture('reg.exe', ['query', root, '/v', valueName]);
  const re = new RegExp('^\\s*' + valueName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+REG_[A-Z_]+\\s+(.*)$', 'mi');
  const m = out.match(re);
  return m ? m[1].trim() : '';
}

function normalizeVersion(v) { const t = String(v || '').trim(); return t.replace(/^(\d+\.\d+\.\d+)\.0$/, '$1'); }
function fileVersion(exe) {
  if (process.platform !== 'win32' || !isFile(exe)) return '';
  const esc = exe.replace(/'/g, "''");
  const cmd = "(Get-Item -LiteralPath '" + esc + "').VersionInfo | ForEach-Object { $_.ProductVersion + '|' + $_.FileVersion }";
  const out = runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd]);
  const parts = String(out || '').trim().split('|').map(x => x.trim()).filter(Boolean);
  return normalizeVersion(parts[0] || parts[1] || '');
}

/* ---------------- N1MM 检测 ---------------- */
function detectN1MM() {
  const r = {
    installed: false, version: '', installDir: '', exePath: '',
    dataDir: '', databasesDir: '', exportFilesDir: '', iniPath: '',
    databases: [], hasUserDatabase: false, exportFileCount: 0,
    operator: '', lastVersionExecuted: '', recentContest: '', recentContestDate: '', detection: 'none'
  };
  const entries = findUninstall(['N1MM Logger+', 'N1MM Logger']);
  const dirs = [];
  entries.forEach(e => { if (e.installLocation) dirs.push(e.installLocation.replace(/[\\/]+$/, '')); });
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  dirs.push(path.join(pf86, 'N1MM Logger+'), path.join(pf, 'N1MM Logger+'), 'C:\\N1MM Logger+');
  for (const d of dirs) {
    const exe = path.join(d, 'N1MMLogger.net.exe');
    if (isFile(exe)) { r.installDir = d; r.exePath = exe; r.installed = true; r.detection = entries.length ? 'registry' : 'common-path'; break; }
  }
  if (entries[0] && entries[0].displayVersion) r.version = entries[0].displayVersion;
  if (!r.version && r.exePath) r.version = fileVersion(r.exePath);
  r.version = normalizeVersion(r.version);

  const dataCandidates = [];
  const personal = regValue('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders', 'Personal');
  if (personal) dataCandidates.push(path.join(expandEnv(personal), 'N1MM Logger+'));
  const home = os.homedir();
  dataCandidates.push(
    path.join(home, 'Documents', 'N1MM Logger+'),
    path.join(home, 'OneDrive', 'Documents', 'N1MM Logger+'),
    path.join(home, 'OneDrive', '文档', 'N1MM Logger+')
  );
  if (process.env.APPDATA) dataCandidates.push(path.join(process.env.APPDATA, 'N1MM Logger+'));
  if (process.env.LOCALAPPDATA) dataCandidates.push(path.join(process.env.LOCALAPPDATA, 'N1MM Logger+'));
  if (r.installDir) dataCandidates.push(r.installDir);
  for (const c of dataCandidates) {
    if (!c) continue;
    if (isDir(c) && (isDir(path.join(c, 'Databases')) || isFile(path.join(c, 'N1MM Logger.ini')))) { r.dataDir = c; break; }
  }
  if (r.dataDir) {
    r.databasesDir = path.join(r.dataDir, 'Databases');
    r.exportFilesDir = path.join(r.dataDir, 'ExportFiles');
    r.iniPath = path.join(r.dataDir, 'N1MM Logger.ini');
    for (const e of listDir(r.databasesDir)) {
      if (!e.isFile() || !/\.s3db$/i.test(e.name)) continue;
      const full = path.join(r.databasesDir, e.name);
      const st = safeStat(full);
      const system = /(n1mm\s*)?(admin|dxlog|packet\s*spots)/i.test(e.name);
      r.databases.push({ name: e.name, size: st ? st.size : 0, mtime: st ? st.mtime.toISOString() : '', system });
    }
    r.databases.sort((a, b) => (a.system === b.system ? a.name.localeCompare(b.name) : (a.system ? 1 : -1)));
    r.hasUserDatabase = r.databases.some(d => !d.system);
    r.exportFileCount = listDir(r.exportFilesDir).filter(e => e.isFile() && /\.(adi|log|txt|csv)$/i.test(e.name)).length;
    if (isFile(r.iniPath)) {
      const ini = parseIni(safeReadText(r.iniPath));
      r.operator = (ini['EntryWindow'] && ini['EntryWindow']['Operator']) || '';
      r.lastVersionExecuted = (ini['Other'] && ini['Other']['LastVersionExecuted']) || (ini['Configurer'] && ini['Configurer']['LastVersionExecuted']) || '';
      const rc = (ini['Configurer'] && ini['Configurer']['RecentContest 1']) || '';
      if (rc) { const parts = rc.split('|'); r.recentContest = (parts[0] || '').trim(); r.recentContestDate = (parts[1] || '').trim(); }
      if (!r.version && r.lastVersionExecuted) r.version = r.lastVersionExecuted;
    }
  }
  r.installDirDisplay = displayPath(r.installDir);
  r.dataDirDisplay = displayPath(r.dataDir);
  return r;
}

/* ---------------- TQSL 检测 ---------------- */
function detectTQSL() {
  const r = { installed: false, version: '', exePath: '', configDir: '', configFound: false };
  const entries = findUninstall(['TrustedQSL', 'Trusted QSL', 'TQSL']);
  const dirs = [];
  entries.forEach(e => { if (e.installLocation) dirs.push(e.installLocation.replace(/[\\/]+$/, '')); });
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  dirs.push(path.join(pf86, 'TrustedQSL'), path.join(pf, 'TrustedQSL'));
  for (const d of dirs) {
    const exe = path.join(d, 'tqsl.exe');
    if (isFile(exe)) { r.installed = true; r.exePath = exe; break; }
  }
  if (entries[0] && entries[0].displayVersion) r.version = entries[0].displayVersion;
  if (!r.version && r.exePath) r.version = fileVersion(r.exePath);
  r.version = normalizeVersion(r.version);
  if (process.env.APPDATA) { r.configDir = path.join(process.env.APPDATA, 'TrustedQSL'); r.configFound = isDir(r.configDir); }
  return r;
}

/* ---------------- 个性化建议 ---------------- */
function buildGuidance(n, t) {
  const g = [];
  if (!n.installed) g.push({ level: 'warn', text: '未检测到 N1MM Logger+：请先安装官方 Full Install，再安装 Latest Update。' });
  else g.push({ level: 'ok', text: '已检测到 N1MM Logger+ ' + (n.version || '（版本未知）') + '。' });
  if (n.dataDir) g.push({ level: 'ok', text: '用户数据目录已找到：' + n.dataDirDisplay + '，数据库 ' + n.databases.length + ' 个。' });
  else g.push({ level: 'warn', text: '未找到用户数据目录：首次启动 N1MM 后会自动创建 Documents\\N1MM Logger+。' });
  if (n.dataDir) {
    if (n.hasUserDatabase) g.push({ level: 'ok', text: '检测到个人数据库，可直接新建比赛/日常日志。' });
    else g.push({ level: 'tip', text: '还没有个人数据库：建议 File > New Database… 新建一个，不要使用 N1MM Admin / DXLog 系统库记录日志。' });
    if (n.operator) g.push({ level: 'ok', text: '检测到操作员呼号：' + n.operator + '（可在下方补充或修改）。' });
    else g.push({ level: 'tip', text: '未检测到呼号：可在下方填写，或启动 N1MM 后用 Config > Change Your Station Data 设置。' });
    if (n.exportFileCount > 0) g.push({ level: 'ok', text: 'ExportFiles 中已有 ' + n.exportFileCount + ' 个导出文件。' });
    else g.push({ level: 'tip', text: 'ExportFiles 目前为空：还没有导出过 ADIF / Cabrillo。' });
  }
  if (t.installed) g.push({ level: 'ok', text: '已检测到 TQSL ' + (t.version || '（版本未知）') + '。' });
  else g.push({ level: 'tip', text: '未检测到 TQSL：如果需要上传 LoTW，请到 ARRL 官网安装 TQSL。' });
  if (t.installed && !t.configFound) g.push({ level: 'tip', text: 'TQSL 已安装但未发现配置目录：可能还没有申请呼号证书或创建 Station Location。' });
  return g;
}

function detectEnvironment() {
  const n1mm = detectN1MM();
  const tqsl = detectTQSL();
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    host: { platform: os.platform(), release: os.release(), arch: os.arch(), node: process.version },
    n1mm,
    tqsl,
    guidance: buildGuidance(n1mm, tqsl),
    privacy: '仅返回安装/数据目录、数据库文件名、INI 中显式允许的少量字段（EntryWindow.Operator、LastVersionExecuted、RecentContest）。不会返回 emailAddress、密码、QSO 内容或 TQSL 私钥/证书内容。'
  };
}

/* ---------------- HTTP 基础 ---------------- */
function send(res, code, body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Content-Length': buf.length, 'Cache-Control': 'no-store' });
  res.end(buf);
}
function sendJson(res, code, obj) { send(res, code, JSON.stringify(obj, null, 2), 'application/json; charset=utf-8'); }
function isLoopbackName(h) { return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]'; }
function isLocalRequest(req) {
  const raw = req.headers.host || '';
  const hostname = raw.startsWith('[') ? raw.slice(1, raw.indexOf(']')) : raw.split(':')[0];
  if (!isLoopbackName(hostname)) return false;
  const origin = req.headers.origin;
  if (origin) {
    try { const u = new URL(origin); if (!isLoopbackName(u.hostname)) return false; } catch (e) { return false; }
  }
  return true;
}
async function handleStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.resolve(__dirname, '.' + rel);
  if (!abs.startsWith(__dirname)) return send(res, 403, '403 Forbidden');
  let stat;
  try { stat = await fs.promises.stat(abs); } catch (e) { return send(res, 404, '404 Not Found: ' + rel); }
  if (stat.isDirectory()) {
    const idx = path.join(abs, 'index.html');
    try { stat = await fs.promises.stat(idx); return streamFile(res, idx, stat); } catch (e) { return send(res, 404, '404 Not Found'); }
  }
  return streamFile(res, abs, stat);
}
function streamFile(res, abs, stat) {
  const ext = path.extname(abs).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': 'no-cache' });
  fs.createReadStream(abs).pipe(res);
}
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}
async function handleChat(req, res) {
  try {
    const raw = await readBody(req);
    let parsed;
    try { parsed = JSON.parse(raw.toString('utf8')); } catch (e) { return send(res, 400, 'Invalid JSON body'); }
    if (!parsed || !Array.isArray(parsed.messages)) return send(res, 400, 'Body must contain "messages" array');
    const auth = req.headers['authorization'] || (process.env.DEEPSEEK_API_KEY ? 'Bearer ' + process.env.DEEPSEEK_API_KEY : '');
    if (!auth) return send(res, 401, 'Missing Authorization header (DeepSeek API Key)');
    const upstream = await fetch(UPSTREAM + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth, 'Accept': req.headers['accept'] || 'text/event-stream' },
      body: JSON.stringify(parsed)
    });
    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive'
    });
    if (!upstream.body) { res.end(); return; }
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('[代理错误]', err && err.message ? err.message : err);
    send(res, 502, 'Proxy error: ' + (err && err.message ? err.message : String(err)));
  }
}

/* ---------------- 服务器 ---------------- */
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const pathname = url.split('?')[0];
  if (pathname.startsWith('/api/') && !isLocalRequest(req)) return send(res, 403, '403 Forbidden: API is only available on localhost');
  if (req.method === 'GET' && pathname === '/api/health') return sendJson(res, 200, { ok: true, service: 'n1mm-cn-guide', time: new Date().toISOString() });
  if (req.method === 'GET' && pathname === '/api/detect') {
    try { return sendJson(res, 200, detectEnvironment()); }
    catch (e) { return sendJson(res, 500, { ok: false, error: String(e && e.message || e) }); }
  }
  if (req.method === 'POST' && pathname === '/api/chat') return handleChat(req, res);
  if (req.method === 'GET' || req.method === 'HEAD') return handleStatic(req, res, url);
  return send(res, 405, '405 Method Not Allowed');
});

function openBrowser(url) {
  try {
    if (process.platform === 'win32') { spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref(); }
    else if (process.platform === 'darwin') { spawn('open', [url], { detached: true, stdio: 'ignore' }).unref(); }
    else { spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref(); }
  } catch (e) { console.warn('无法自动打开浏览器，请手动访问：' + url); }
}
server.on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    console.error('[端口占用] ' + port + ' 已被占用，正在尝试 ' + (port + 1) + ' ...');
    port += 1; setTimeout(() => server.listen(port, '127.0.0.1'), 50);
  } else { console.error('[服务器错误]', err); process.exit(1); }
});
server.listen(port, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let det = null;
  try { det = detectEnvironment(); } catch (e) {}
  console.log('');
  console.log('  ============================================================');
  console.log('   N1MM Logger+ 中文指南已启动');
  console.log('   网址：' + url);
  if (det) {
    console.log('   检测：N1MM ' + (det.n1mm.installed ? (det.n1mm.version || '已安装') : '未检测到') +
      (det.n1mm.dataDir ? '  |  数据目录 ' + det.n1mm.dataDirDisplay : ''));
    console.log('   检测：TQSL ' + (det.tqsl.installed ? (det.tqsl.version || '已安装') : '未检测到') +
      (det.n1mm.operator ? '  |  呼号 ' + det.n1mm.operator : ''));
  }
  console.log('   代理：POST ' + url + 'api/chat  ->  ' + UPSTREAM + '/chat/completions');
  console.log('   关闭此窗口即停止服务。按 Ctrl+C 也可停止。');
  console.log('  ============================================================');
  console.log('');
  if (!noOpen) openBrowser(url);
});
