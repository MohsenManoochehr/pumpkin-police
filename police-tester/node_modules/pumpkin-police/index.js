function TryCatch(code) {
  try {
    code;
  } catch (error) {
    console.log("error.message", error.message);
  }
}

module.exports = {
  TryCatch,
};
