const { TryCatch } = require("pumpkin-police");

function test() {
  TryCatch(() => {
    throw new Error("this is an error");
  });
}

test();
