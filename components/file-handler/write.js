// utils/write.js (CommonJS)
const fs = require("fs").promises;
const path = require("path");

async function write(data, address) {
  await fs.mkdir(path.dirname(address), { recursive: true });

  const ext = path.extname(address).toLowerCase();

  if (ext === ".json") {
    let current;
    try {
      const raw = await fs.readFile(address, "utf8");
      if (!raw.trim()) {
        current = inferEmptyFromData(data);
      } else {
        current = JSON.parse(raw);
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        current = inferEmptyFromData(data);
      } else {
        throw err;
      }
    }

    let next;
    if (Array.isArray(current)) {
      next = Array.isArray(data)
        ? current.concat(data)
        : current.concat([data]);
    } else if (current && typeof current === "object") {
      const add = data && typeof data === "object" ? data : { value: data };
      next = { ...current, ...add }; // shallow merge
    } else {
      // If file had a primitive, just replace with incoming data
      next = data;
    }

    // Atomic-ish write
    const tmp = `${address}.tmp-${process.pid}-${Date.now()}`;
    await fs.writeFile(tmp, JSON.stringify(next, null, 2));
    await fs.rename(tmp, address);
    return next;
  }

  // Non-JSON: append a line
  const line =
    typeof data === "string" || Buffer.isBuffer(data)
      ? data
      : JSON.stringify(data);
  await fs.appendFile(address, line + "\n");
  return true;
}

function inferEmptyFromData(data) {
  if (Array.isArray(data)) return [];
  if (data && typeof data === "object") return {};
  return [];
}

module.exports = write;
