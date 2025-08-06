const { Catch } = require("../catch/Catch");

function TryCatch(code) {
  try {
    code();
  } catch (error) {
    Catch(error);
  }
}

module.exports = {
  TryCatch,
};
