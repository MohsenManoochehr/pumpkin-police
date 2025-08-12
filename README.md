# police-office

Tiny, zero-dep error **reporter + file logger** for Node/Electron apps.

- Send a structured payload to **your API** on errors.
- **Always** log a structured entry to a local **JSON file** (append-only).
- Project config comes from `police-office.json` (via `cosmiconfig`).

> Works great in Electron (dev & packaged), plain Node, scripts, and CLIs.

---

## Features

- CommonJS first  
- Config via `police-office.json` (same repo or Electron `userData`)  
- Safe file appends (JSON array)  
- One-liner `TryCatch` wrapper for sync/async  
- Pluggable `write()` (your existing helper)  
- Node 18+ native `fetch` (or `node-fetch` fallback)

---

## Install

```bash
npm i police-office
# or if you're authoring locally, add your files and require by path
```

> Node ≥ 18 recommended (bundled `fetch`). For Node 16, add:  
> `npm i node-fetch` and follow the comment in `Catch.js`.

---

## Quick start

### 1) Create a config file

Create `police-office.json`:

```json
{
  "config": {
    "api": {
      "url": "https://your.api.example.com/collect",
      "example_payload": { "title": "diag", "version": "8.1.5" },
      "payload_error_name": "data"
    },
    "logs": {
      "folder_path": "./",
      "folder_name": "logs",
      "file_name": "log"
    }
  }
}
```

- `payload_error_name` is the key your error details will be attached under.
- Logs will be written to `logs/log.json` (as a growing JSON **array**).

### 2) Use the helpers

```js
// CommonJS
const { TryCatch } = require('police-office/utils/TryCatch');

// wrap anything (sync or async)
await TryCatch(async () => {
  // your risky code
  throw new Error('boom');
});
```

That’s it. On failure:
1) It POSTs `{ ...example_payload, [payload_error_name]: errorProps }` to your `api.url`.
2) If sending fails or API returns an error, it appends a JSON entry to `logs/log.json` using your `write()` helper.

---

## What gets sent & logged?

### API request
```json
{
  "title": "diag",
  "version": "8.1.5",
  "data": {
    "name": "Error",
    "message": "boom",
    "stack": "..."
  }
}
```

### Local log entry (appended to `log.json` as an array item)
```json
{
  "when": "2025-08-12T08:45:12.345Z",
  "message": "HTTP 500",
  "payload": { /* what we tried to send */ },
  "error": { "name": "Error", "message": "boom", "stack": "..." }
}
```

---

## Code snippets

### `config/configLoader.js`

```js
// CommonJS
const { cosmiconfig } = require('cosmiconfig');
const path = require('path');

function getSearchFrom() {
  // Allow override via env
  if (process.env.POLICEOFFICE_CONFIG_FROM) return process.env.POLICEOFFICE_CONFIG_FROM;

  // Electron-aware default
  try {
    const { app } = require('electron');
    if (app) {
      return app.isPackaged ? app.getPath('userData') : process.cwd();
    }
  } catch {/* not running in Electron main */}

  return process.cwd();
}

async function loadConfig() {
  const explorer = cosmiconfig('policeoffice', {
    searchPlaces: ['police-office.json'],
  });

  // Exact file override
  if (process.env.POLICEOFFICE_CONFIG_FILE) {
    const res = await explorer.load(path.resolve(process.env.POLICEOFFICE_CONFIG_FILE));
    return res?.config ?? {};
  }

  const res = await explorer.search(getSearchFrom());
  return res?.config ?? {};
}

module.exports = { loadConfig };
```

### `catch/Catch.js`

```js
// CommonJS
const path = require('path');
const { loadConfig } = require('../config/configLoader');
const write = require('../utils/write'); // your CommonJS write()

// If Node < 18, install node-fetch and uncomment:
// const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const CONFIG_P = loadConfig();

function resolveBaseDir(relBase = './') {
  const path = require('path');
  if (path.isAbsolute(relBase)) return relBase;

  // Electron userData in packaged apps
  try {
    const { app } = require('electron');
    if (app) return app.getPath('userData');
  } catch {}

  // Fallback for dev/Node
  return process.cwd();
}

function logPathFromConfig(logs) {
  const folderPath = logs?.folder_path || './';
  const folderName = logs?.folder_name || 'logs';
  const fileName = (logs?.file_name || 'log').replace(/[^\w.-]/g, '_');
  const base = resolveBaseDir(folderPath);
  return path.resolve(base, folderName, `${fileName}.json`); // ensure .json
}

async function Catch(errorProps) {
  const CFG = await CONFIG_P;           // { config: { api, logs } }
  const api = CFG.config?.api || {};
  const logs = CFG.config?.logs || {};

  const payload = {
    ...(api.example_payload || {}),
    [api.payload_error_name || 'data']: errorProps,
  };

  try {
    if (!api.url) throw new Error('Missing api.url in config');

    const res = await fetch(api.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let json = null;
    try { json = await res.json(); } catch {}

    if (!res.ok || (json && json.status === 'error')) {
      const msg = json?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json ?? { ok: true };
  } catch (err) {
    const entry = {
      when: new Date().toISOString(),
      message: String(err?.message || err),
      payload,
      error: errorProps,
    };

    const file = logPathFromConfig(logs);
    await write([entry], file); // append to JSON array
    return { ok: false, logged: true, file };
  }
}

module.exports = { Catch };
```

### `utils/write.js` (CommonJS, example)

```js
const fs = require('fs').promises;
const path = require('path');

async function write(data, address) {
  await fs.mkdir(path.dirname(address), { recursive: true });

  const ext = path.extname(address).toLowerCase();

  if (ext === '.json') {
    let current;
    try {
      const raw = await fs.readFile(address, 'utf8');
      current = raw.trim() ? JSON.parse(raw) : [];
    } catch (err) {
      if (err.code === 'ENOENT') current = [];
      else throw err;
    }

    let next;
    if (Array.isArray(current)) {
      next = Array.isArray(data) ? current.concat(data) : current.concat([data]);
    } else if (current && typeof current === 'object') {
      const add = (data && typeof data === 'object') ? data : { value: data };
      next = { ...current, ...add };
    } else {
      next = data;
    }

    const tmp = `${address}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2));
    await fs.rename(tmp, address);
    return next;
  }

  const line = (typeof data === 'string' || Buffer.isBuffer(data))
    ? data
    : JSON.stringify(data);
  await fs.appendFile(address, line + '\\n');
  return true;
}

module.exports = write;
```

### `utils/TryCatch.js`

```js
const { Catch } = require('../catch/Catch');

function toErrorProps(err, ctx) {
  return {
    name: err?.name,
    message: err?.message || String(err),
    stack: err?.stack,
    ...ctx,
  };
}

async function TryCatch(codeOrPromise, ctx = {}, opts = {}) {
  try {
    const p = typeof codeOrPromise === 'function'
      ? Promise.resolve().then(codeOrPromise)
      : Promise.resolve(codeOrPromise);
    return await p;
  } catch (err) {
    await Catch(toErrorProps(err, ctx));
    if (opts.rethrow) throw err;
    return undefined;
  }
}

module.exports = { TryCatch };
```

---

## Electron notes

- **Dev:** keep `police-office.json` in your project root.
- **Packaged app:** prefer storing the config in Electron’s **userData** directory (writable per user). The loader above looks there automatically when packaged.
- Optional overrides:
  - `POLICEOFFICE_CONFIG_FILE=/abs/path/to/police-office.json`
  - `POLICEOFFICE_CONFIG_FROM=/abs/search/start/dir`

---

## Configuration reference

```ts
// police-office.json
{
  "config": {
    "api": {
      "url": string,                      // required
      "example_payload": object,          // merged into every send
      "payload_error_name": string        // where errorProps will be attached (default: "data")
    },
    "logs": {
      "folder_path": string,              // base folder (relative to cwd or userData); default "./"
      "folder_name": string,              // default "logs"
      "file_name": string                 // default "log" -> produces log.json
    }
  }
}
```

> **Tip:** keep secrets (tokens, passwords) out of your repo. Use env vars or OS keychain.

---

## Minimal example structure

```
your-app/
├─ police-office.json
├─ src/
│  ├─ catch/Catch.js
│  ├─ utils/TryCatch.js
│  └─ utils/write.js
└─ index.js
```

---

## Troubleshooting

- **Nothing is logged:** ensure the log path resolves to a writable location (in Electron packaged apps, do **not** write inside `app.asar` or `node_modules`).  
- **Config not found:** verify `police-office.json` exists where your loader searches (project root in dev; `userData` in production).  
- **API keeps failing:** you’ll still get local logs; inspect `logs/log.json` for `payload` and `message`.

---


