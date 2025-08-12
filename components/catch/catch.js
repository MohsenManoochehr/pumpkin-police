// catch.js (CommonJS)
const path = require("path");
const { loadConfig } = require("../config/configLoader");
const write = require("../file-handler/write"); // your CommonJS write()

// If Node < 18, install node-fetch and uncomment:
// const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const CONFIG_P = loadConfig();

function logPathFromConfig(logs) {
  const folderPath = logs?.folder_path || "./";
  const folderName = logs?.folder_name || "logs";
  const fileName = (logs?.file_name || "log").replace(/[^\w.-]/g, "_");
  // IMPORTANT: use .json so your write() goes into JSON mode
  return path.resolve(
    process.cwd(),
    folderPath,
    folderName,
    `${fileName}.json`
  );
}

async function Catch(errorProps) {
  const CFG = await CONFIG_P; // your loader returns { config: { api, logs } }
  const api = CFG.config?.api || {};
  const logs = CFG.config?.logs || {};

  const payload = {
    ...(api.example_payload || {}),
    [api.payload_error_name || "data"]: errorProps,
  };

  try {
    if (!api.url) throw new Error("Missing api.url in config");

    const res = await fetch(api.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    let json = null;
    try {
      json = await res.json();
    } catch {}

    if (!res.ok || (json && json.status === "error")) {
      const msg = json?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return json ?? { ok: true };
  } catch (err) {
    // Append an entry to a JSON ARRAY file using your write()
    const entry = {
      when: new Date().toISOString(),
      message: String(err?.message || err),
      payload,
      error: errorProps,
    };

    const file = logPathFromConfig(logs);
    await write([entry], file); // pass as ARRAY to force "append to array" behavior
    return { ok: false, logged: true, file };
  }
}

module.exports = { Catch };
