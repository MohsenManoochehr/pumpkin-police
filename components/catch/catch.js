const { loadConfig } = require("../config/configLoader");

const CONFIG = await loadConfig();

function Catch(errorProps) {
  try {
    let payload = CONFIG.api.example_payload;
    payload[CONFIG.api.payload_error_name] = errorProps;
    const result = fetch(CONFIG.api.url, payload);
    if (result.data.status === "error") {
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.log("error", error);
    fs.writeFile(errorProps);
  }
}

module.exports = {
  Catch,
};
