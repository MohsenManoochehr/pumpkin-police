const { Catch } = "../catch/catch";

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
