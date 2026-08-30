const Module = require("node:module");

const REACT_SERVER_ALIASES = {
  "next/navigation": "next/dist/client/components/navigation.react-server.js",
};

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolveWithReactServerAliases(request, ...rest) {
  return originalResolve.call(this, REACT_SERVER_ALIASES[request] || request, ...rest);
};
