#!/usr/bin/env node
// ============================================================================
// Sakura Studio Local MCP Server (Zero-dependency Node.js stdio JSON-RPC 2.0)
// Visually renders 3D sprite-stack contact sheets and procedural courtyards
// from katana-zero-archer/playground/ via headless Chromium so agents can
// inspect every sprite and floor pattern before showing the user.
//
// Also supports direct CLI invocation:
//   node sakura-studio-server.mjs --cli sakura_render_sprite_sheet '{"kinds":["broken_torii"]}'
// ============================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PLAYGROUND_DIR = path.join(PROJECT_ROOT, 'playground');
const MODULES_DIR = path.join(PLAYGROUND_DIR, 'modules');
const PREVIEWS_DIR = path.join(__dirname, 'previews');
fs.mkdirSync(PREVIEWS_DIR, { recursive: true });

const CHROME_CANDIDATES = [
  process.env.SAKURA_CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findBrowserExecutable() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Could not locate Chrome or Edge executable. Set SAKURA_CHROME_PATH.');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function startEphemeralServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
        let relPath = decodeURIComponent(reqUrl.pathname);
        if (relPath === '/' || relPath === '') relPath = '/index.html';
        const fullPath = path.resolve(PLAYGROUND_DIR, '.' + relPath);
        if (!fullPath.startsWith(PLAYGROUND_DIR)) {
          res.writeHead(403); res.end('Forbidden'); return;
        }
        if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
          res.writeHead(404); res.end('Not found'); return;
        }
        const ext = path.extname(fullPath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        fs.createReadStream(fullPath).pipe(res);
      } catch (err) {
        res.writeHead(500); res.end(String(err));
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function sanitizeFileName(name, fallback) {
  const clean = String(name || fallback).replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.png$/i, '');
  return (clean || fallback) + '.png';
}

async function captureStudioPng(queryParams, width, height, outFileName, virtualBudgetMs = 2600) {
  const chrome = findBrowserExecutable();
  const { server, port } = await startEphemeralServer();
  const outPath = path.join(PREVIEWS_DIR, outFileName);
  const qs = new URLSearchParams(queryParams).toString();
  const targetUrl = `http://127.0.0.1:${port}/index.html?${qs}`;

  try {
    await new Promise((resolve, reject) => {
      const args = [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${width},${height}`,
        `--virtual-time-budget=${virtualBudgetMs}`,
        `--screenshot=${outPath}`,
        targetUrl,
      ];
      execFile(chrome, args, { timeout: 30000, windowsHide: true }, (err, _stdout, stderr) => {
        if (err) {
          reject(new Error(`Headless capture failed: ${err.message}\n${stderr || ''}`));
          return;
        }
        resolve();
      });
    });

    if (!fs.existsSync(outPath)) {
      throw new Error(`Screenshot was not written to ${outPath}`);
    }
    const stat = fs.statSync(outPath);
    return { outPath, bytes: stat.size, url: targetUrl };
  } finally {
    await new Promise(r => server.close(r));
  }
}

// ============================================================================
// Tool Implementations
// ============================================================================
async function handleRenderSpriteSheet(args = {}) {
  const kindsArr = Array.isArray(args.kinds)
    ? args.kinds
    : String(args.kinds || 'broken_torii,ruin_wall_stub,ruin_foundation,fallen_lantern,broken_pillar,ruin_rubble')
        .split(',').map(s => s.trim()).filter(Boolean);
  const zoom = Math.max(1, Math.min(5, Number(args.zoom) || 3));
  const tilt = Math.max(0.45, Math.min(0.95, Number(args.tilt) || 0.72));
  const width = Math.max(800, Math.min(2000, Number(args.width) || 1280));
  const height = Math.max(540, Math.min(2000, Number(args.height) || Math.max(760, kindsArr.length * 145 + 64)));
  const outFile = sanitizeFileName(args.outName, 'sprites_sheet');

  const res = await captureStudioPng(
    { studio: 'sprites', kinds: kindsArr.join(','), zoom: String(zoom), tilt: String(tilt) },
    width, height, outFile, 2200
  );
  const b64 = fs.readFileSync(res.outPath).toString('base64');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'ok',
          path: res.outPath,
          bytes: res.bytes,
          width, height, zoom, tilt,
          kinds: kindsArr,
        }, null, 2),
      },
      { type: 'image', mimeType: 'image/png', data: b64 },
    ],
  };
}

async function handleRenderCourtyard(args = {}) {
  const start = ['ruins', 'sanctuary', 'crossroads', 'lake'].includes(args.start) ? args.start : 'ruins';
  const shape = ['grand', 'l_shape', 'elongated'].includes(args.shape) ? args.shape : 'grand';
  const seed = Number.isFinite(Number(args.seed)) && Number(args.seed) > 0 ? Math.floor(Number(args.seed)) : 344;
  const zoom = Math.max(1, Math.min(5, Number(args.zoom) || 2));
  const tilt = Math.max(48, Math.min(92, Number(args.tilt) || 72));
  const angle = Number.isFinite(Number(args.angle)) ? Number(args.angle) : 0.52;
  const cx = Number.isFinite(Number(args.cx)) ? Number(args.cx) : 0;
  const cy = Number.isFinite(Number(args.cy)) ? Number(args.cy) : 0;
  const width = Math.max(800, Math.min(2000, Number(args.width) || 1400));
  const height = Math.max(600, Math.min(1600, Number(args.height) || 960));
  const outFile = sanitizeFileName(args.outName, `courtyard_${start}_${shape}_${seed}`);

  const res = await captureStudioPng(
    {
      studio: 'courtyard',
      start, shape,
      seed: String(seed),
      zoom: String(zoom),
      tilt: String(tilt),
      angle: String(angle),
      cx: String(cx),
      cy: String(cy),
    },
    width, height, outFile, 3000
  );
  const b64 = fs.readFileSync(res.outPath).toString('base64');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          status: 'ok',
          path: res.outPath,
          bytes: res.bytes,
          start, shape, seed, zoom, tilt, angle, cx, cy, width, height,
        }, null, 2),
      },
      { type: 'image', mimeType: 'image/png', data: b64 },
    ],
  };
}

async function handleRenderVfxSheet(args = {}) {
  const width = Math.max(960, Math.min(2000, Number(args.width) || 1380));
  const height = Math.max(720, Math.min(1800, Number(args.height) || 960));
  const outFile = sanitizeFileName(args.outName, 'vfx_sheet');
  const res = await captureStudioPng({ studio: 'vfx' }, width, height, outFile, 2400);
  const b64 = fs.readFileSync(res.outPath).toString('base64');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ status: 'ok', path: res.outPath, bytes: res.bytes, width, height }, null, 2),
      },
      { type: 'image', mimeType: 'image/png', data: b64 },
    ],
  };
}

function handleListAssets() {
  const html = fs.readFileSync(path.join(PLAYGROUND_DIR, 'index.html'), 'utf8');
  const m = html.match(/const PROP_META = \{([\s\S]*?)\n\};/);
  const props = [];
  if (m) {
    const rx = /^\s*([a-zA-Z0-9_]+)\s*:\s*\{\s*sw:\s*(\d+),\s*slices:\s*(\d+)[^}]*r:\s*([\d.]+),\s*shR:\s*([\d.]+)/gm;
    let hit;
    while ((hit = rx.exec(m[1])) !== null) {
      props.push({
        kind: hit[1],
        sw: Number(hit[2]),
        slices: Number(hit[3]),
        r: Number(hit[4]),
        shR: Number(hit[5]),
      });
    }
  }
  const modules = fs.existsSync(MODULES_DIR)
    ? fs.readdirSync(MODULES_DIR).filter(f => f.endsWith('.js')).sort()
    : [];
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          playgroundDir: PLAYGROUND_DIR,
          moduleFiles: modules,
          propCount: props.length,
          props,
        }, null, 2),
      },
    ],
  };
}

function handleCheckSyntax() {
  const results = [];
  const checkSource = (label, code) => {
    try {
      new vm.Script(code, { filename: label });
      results.push({ file: label, ok: true });
    } catch (err) {
      results.push({ file: label, ok: false, error: err.message, stack: String(err.stack || '').split('\n').slice(0, 4).join('\n') });
    }
  };

  if (fs.existsSync(MODULES_DIR)) {
    for (const f of fs.readdirSync(MODULES_DIR).filter(x => x.endsWith('.js')).sort()) {
      const full = path.join(MODULES_DIR, f);
      checkSource(`modules/${f}`, fs.readFileSync(full, 'utf8'));
    }
  }

  const html = fs.readFileSync(path.join(PLAYGROUND_DIR, 'index.html'), 'utf8');
  const scriptMatches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  scriptMatches.forEach((m, idx) => {
    checkSource(`index.html#script[${idx}]`, m[1]);
  });

  const allOk = results.every(r => r.ok);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: allOk, checked: results.length, results }, null, 2),
      },
    ],
    isError: !allOk,
  };
}

const TOOLS = [
  {
    name: 'sakura_render_sprite_sheet',
    description: 'Render a multi-angle (0°, 45°, 135°, 225°) close-up PNG contact sheet of 3D sprite-stack assets from Sakura Shrine using headless Chromium, returning both the saved file path and inline PNG.',
    inputSchema: {
      type: 'object',
      properties: {
        kinds: {
          type: 'array',
          items: { type: 'string' },
          description: 'PROP_META keys to render (e.g. ["broken_torii","ruin_wall_stub","ruin_foundation","fallen_lantern","broken_pillar","ruin_rubble"]).',
        },
        zoom: { type: 'number', description: 'Pixel zoom multiplier (1-5, default 3).' },
        tilt: { type: 'number', description: 'Camera tilt (0.45-0.95, default 0.72).' },
        width: { type: 'number', description: 'Viewport width in px (default 1280).' },
        height: { type: 'number', description: 'Viewport height in px.' },
        outName: { type: 'string', description: 'Output filename stem under mcp/previews/.' },
      },
    },
  },
  {
    name: 'sakura_render_courtyard',
    description: 'Render an uncluttered deterministic courtyard preview PNG (ruins, sanctuary, crossroads, or lake) for a specific shape (grand, l_shape, elongated) and seed, returning the saved file path and inline PNG.',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'string', enum: ['ruins', 'sanctuary', 'crossroads', 'lake'] },
        shape: { type: 'string', enum: ['grand', 'l_shape', 'elongated'] },
        seed: { type: 'number' },
        zoom: { type: 'number', description: 'Zoom level 1-5 (default 2).' },
        tilt: { type: 'number', description: 'Camera tilt 48-92 (default 72).' },
        angle: { type: 'number', description: 'Camera yaw angle in radians (default 0.52).' },
        cx: { type: 'number', description: 'Camera center X in world units (default 0).' },
        cy: { type: 'number', description: 'Camera center Y in world units (default 0).' },
        width: { type: 'number', description: 'Viewport width (default 1400).' },
        height: { type: 'number', description: 'Viewport height (default 960).' },
        outName: { type: 'string', description: 'Output filename stem under mcp/previews/.' },
      },
    },
  },
  {
    name: 'sakura_render_vfx_sheet',
    description: 'Render a 3x3 showcase contact sheet PNG of all combat auto-attacks, arrows, dragon arrow, arrow rain, chronos focus, dash burst, iaido slash, sakura blades, forked lightning, solar pillar, and fireball explosions.',
    inputSchema: {
      type: 'object',
      properties: {
        width: { type: 'number' },
        height: { type: 'number' },
        outName: { type: 'string' },
      },
    },
  },
  {
    name: 'sakura_list_assets',
    description: 'List all registered PROP_META sprite kinds (dimensions, slices, radii) and modular JS files under playground/modules/.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sakura_check_syntax',
    description: 'Validate JavaScript syntax across playground/modules/*.js and inline <script> blocks in playground/index.html.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function dispatchTool(name, args) {
  if (name === 'sakura_render_sprite_sheet') return await handleRenderSpriteSheet(args);
  if (name === 'sakura_render_courtyard') return await handleRenderCourtyard(args);
  if (name === 'sakura_render_vfx_sheet') return await handleRenderVfxSheet(args);
  if (name === 'sakura_list_assets') return handleListAssets();
  if (name === 'sakura_check_syntax') return handleCheckSyntax();
  throw new Error(`Unknown tool: ${name}`);
}

// ============================================================================
// Direct CLI Mode (--cli <toolName> '<jsonArgs>')
// ============================================================================
if (process.argv[2] === '--cli') {
  const toolName = process.argv[3];
  const rawArgs = process.argv[4] || '{}';
  (async () => {
    try {
      const parsed = JSON.parse(rawArgs);
      const res = await dispatchTool(toolName, parsed);
      const textParts = (res.content || []).filter(c => c.type === 'text').map(c => c.text);
      console.log(textParts.join('\n'));
      process.exit(res.isError ? 1 : 0);
    } catch (err) {
      console.error(err.stack || String(err));
      process.exit(1);
    }
  })();
} else {
  // ==========================================================================
  // Standard MCP JSON-RPC 2.0 over stdio (supports newline-delimited & Content-Length)
  // ==========================================================================
  let useContentLength = false;
  let buffer = Buffer.alloc(0);

  function sendMessage(obj) {
    const json = JSON.stringify(obj);
    if (useContentLength) {
      const body = Buffer.from(json, 'utf8');
      process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
      process.stdout.write(body);
    } else {
      process.stdout.write(json + '\n');
    }
  }

  async function handleRpc(msg) {
    const { id, method, params } = msg;
    if (method === 'initialize') {
      sendMessage({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: (params && params.protocolVersion) || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'sakura-studio', version: '1.0.0' },
        },
      });
      return;
    }
    if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
      return;
    }
    if (method === 'ping') {
      if (id !== undefined) sendMessage({ jsonrpc: '2.0', id, result: {} });
      return;
    }
    if (method === 'tools/list') {
      sendMessage({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      return;
    }
    if (method === 'tools/call') {
      try {
        const result = await dispatchTool(params.name, params.arguments || {});
        sendMessage({ jsonrpc: '2.0', id, result });
      } catch (err) {
        sendMessage({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          },
        });
      }
      return;
    }
    if (id !== undefined) {
      sendMessage({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    }
  }

  function pumpBuffer() {
    while (buffer.length > 0) {
      // Check for Content-Length header framing
      const headStr = buffer.slice(0, Math.min(buffer.length, 64)).toString('utf8');
      if (/^Content-Length:/i.test(headStr)) {
        useContentLength = true;
        const sepIdx = buffer.indexOf('\r\n\r\n');
        if (sepIdx === -1) return;
        const header = buffer.slice(0, sepIdx).toString('utf8');
        const m = header.match(/Content-Length:\s*(\d+)/i);
        if (!m) { buffer = buffer.slice(sepIdx + 4); continue; }
        const len = parseInt(m[1], 10);
        if (buffer.length < sepIdx + 4 + len) return;
        const payload = buffer.slice(sepIdx + 4, sepIdx + 4 + len).toString('utf8');
        buffer = buffer.slice(sepIdx + 4 + len);
        try { handleRpc(JSON.parse(payload)); } catch (_) {}
        continue;
      }

      // Newline-delimited JSON-RPC (MCP stdio standard)
      const nlIdx = buffer.indexOf('\n');
      if (nlIdx === -1) return;
      const line = buffer.slice(0, nlIdx).toString('utf8').trim();
      buffer = buffer.slice(nlIdx + 1);
      if (!line) continue;
      try { handleRpc(JSON.parse(line)); } catch (_) {}
    }
  }

  process.stdin.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    pumpBuffer();
  });
  process.stdin.resume();
}
