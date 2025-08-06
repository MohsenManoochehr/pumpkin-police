const { TryCatch } = require("./components/try-catch/try-catch");

function tets() {
  throw new Error("This is an error!");
}

TryCatch(test());
