// Next's ESLint plugin uses only globSync(pattern, { onlyDirectories: true }).
// tinyglobby expands literal directories by default and includes trailing '/';
// keep fast-glob's root-directory semantics without micromatch or braces.
// The Next ESLint caller loads this adapter synchronously through CommonJS.
/* eslint-disable @typescript-eslint/no-require-imports */
const { globSync } = require("tinyglobby");
const { isAbsolute } = require("node:path");

exports.globSync = (patterns, options = {}) => {
  const matches = globSync(patterns, {
    expandDirectories: false,
    absolute: typeof patterns === "string" && isAbsolute(patterns),
    ...options,
  });
  if (options.markDirectories) return matches;
  return matches.map((match) =>
    match === "/" || /^[A-Za-z]:\/$/.test(match)
      ? match
      : match.replace(/\/$/, ""),
  );
};
