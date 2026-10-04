import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs");

test("Next ESLint glob roots remain directory-only, non-recursive and brace-compatible", () => {
  const root = mkdtempSync(join(tmpdir(), "next-glob-compat-"));
  try {
    for (const name of ["one", "two"]) mkdirSync(join(root, name, "nested"), { recursive: true });
    writeFileSync(join(root, "README.md"), "fixture");
    const resolve = (rootDir: string | string[]) => getRootDirs({
      cwd: root,
      settings: { next: { rootDir } },
    }).sort();

    assert.deepEqual(resolve(`${root}/{one,two}`), [join(root, "one"), join(root, "two")]);
    assert.deepEqual(resolve(`${root}/*`), [join(root, "one"), join(root, "two")]);
    const relativeRoot = relative(process.cwd(), root);
    assert.deepEqual(resolve(`${relativeRoot}/*`), [join(relativeRoot, "one"), join(relativeRoot, "two")]);
    assert.deepEqual(resolve([join(root, "one"), join(root, "two")]), [join(root, "one"), join(root, "two")]);
    assert.deepEqual(resolve(join(root, "README.md")), []);
    assert.deepEqual(getRootDirs({ cwd: root, settings: {} }), [root]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
