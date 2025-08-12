// utils/TryCatch.js (CommonJS)
const { Catch } = require("../catch/Catch");

function toErrorProps(err, ctx) {
  return {
    name: err?.name,
    message: err?.message || String(err),
    stack: err?.stack,
    ...ctx, // optional metadata you pass (route, userId, etc.)
  };
}

/**
 * TryCatch(codeOrPromise, ctx?, opts?)
 * - codeOrPromise: () => any | Promise<any> | Promise<any>
 * - ctx: optional extra fields to include in errorProps
 * - opts: { rethrow?: boolean } default false
 */
async function TryCatch(codeOrPromise, ctx = {}, opts = {}) {
  try {
    const p =
      typeof codeOrPromise === "function"
        ? Promise.resolve().then(codeOrPromise)
        : Promise.resolve(codeOrPromise);
    return await p;
  } catch (err) {
    await Catch(toErrorProps(err, ctx));
    if (opts.rethrow) throw err; // optionally bubble up
    return undefined;
  }
}

module.exports = { TryCatch };
