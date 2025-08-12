// config/configLoader.js (CommonJS)
const { cosmiconfig } = require("cosmiconfig");
const path = require("path");

function getSearchFrom() {
  // Prefer an explicit override first
  if (process.env.POLICEOFFICE_CONFIG_FROM)
    return process.env.POLICEOFFICE_CONFIG_FROM;

  // Electron? Use userData for installed apps; cwd for dev
  try {
    const { app } = require("electron");
    if (app) {
      // If this throws because app not initialized, we'll fall back
      return app.isPackaged ? app.getPath("userData") : process.cwd();
    }
  } catch {
    /* not running in Electron main */
  }

  return process.cwd();
}

async function loadConfig() {
  const explorer = cosmiconfig("policeoffice", {
    searchPlaces: ["police-office.json"],
  });

  // If the user wants to point to an exact file, allow it:
  if (process.env.POLICEOFFICE_CONFIG_FILE) {
    const res = await explorer.load(
      path.resolve(process.env.POLICEOFFICE_CONFIG_FILE)
    );
    return res?.config ?? {};
  }

  const res = await explorer.search(getSearchFrom());
  return res?.config ?? {};
}

module.exports = { loadConfig };
