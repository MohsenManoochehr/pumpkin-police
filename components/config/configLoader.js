const { cosmiconfig } = require("cosmiconfig");

async function loadConfig() {
  const explorer = cosmiconfig("policeoffice", {
    searchPlaces: ["police-office.json"],
  });

  const result = await explorer.search();
  return result?.config ?? {};
}

module.exports = {
  loadConfig,
};
