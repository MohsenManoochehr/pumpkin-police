const { TryCatch } = require("./components/try-catch/try-catch");

function test() {
  throw new Error("This is an error!");
}

TryCatch(test);
