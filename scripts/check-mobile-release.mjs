/** Static release hygiene and exported-bundle scan; never prints secret matches. */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const mobile = join(root, 'mobile');
const violations = [];
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (['node_modules', '.git', '.expo'].includes(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const allowedPublic = new Set(['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_APP_ENV']);
for (const path of walk(join(mobile, 'src')).filter((p) => /\.[jt]sx?$/.test(p) && !/\.test\./.test(p))) {
  const source = readFileSync(path, 'utf8');
  for (const key of source.match(/EXPO_PUBLIC_[A-Z0-9_]+/g) ?? []) if (!allowedPublic.has(key)) violations.push(`Unexpected public variable in ${relative(root, path)}`);
  if (/console\.(log|debug|info|warn|error)\(/.test(source)) violations.push(`Unreviewed console output in ${relative(root, path)}`);
}
const profiles = JSON.parse(readFileSync(join(mobile, 'eas.json'), 'utf8'));
for (const name of ['development', 'preview', 'production']) {
  const profile = profiles.build[name];
  if (profile?.channel !== name || profile?.environment !== name || profile?.env?.EXPO_PUBLIC_APP_ENV !== name) violations.push(`Profile mismatch: ${name}`);
}
if (profiles.build.production.distribution !== 'store' || profiles.build.production.android.buildType !== 'app-bundle') violations.push('Invalid store distribution');
const exportDirs = process.argv.slice(2);
const leakPatterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /postgres(?:ql)?:\/\//i, /vercel_blob_rw_[A-Za-z0-9]+/, /sk-proj-[A-Za-z0-9_-]{12,}/, /Bearer [A-Za-z0-9_.-]{24,}/, /(?:NEXTAUTH_SECRET|CRON_SECRET|DATABASE_URL)\s*[=:]\s*["'][^"']{8,}/];
for (const dir of exportDirs) {
  for (const path of walk(resolve(dir))) {
    // Hermes stores literals back-to-back without separators. Scanning raw
    // bytecode can join "Bearer " to an unrelated identifier and invent a token.
    // Decode first; compiler failures remain fatal rather than skipping the file.
    const bytes = path.endsWith('.hbc')
      ? execFileSync(join(mobile, 'node_modules/hermes-compiler/hermesc', process.platform === 'darwin' ? 'osx-bin' : process.platform === 'win32' ? 'win64-bin' : 'linux64-bin', process.platform === 'win32' ? 'hermesc.exe' : 'hermesc'), ['-dump-bytecode', path], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })
      : readFileSync(path).toString('utf8');
    if (leakPatterns.some((pattern) => pattern.test(bytes))) violations.push(`Potential secret in export: ${relative(resolve(dir), path)}`);
  }
}
if (violations.length) {
  console.error(violations.join('\n'));
  process.exit(1);
}
const output = process.env.MOBILE_RELEASE_METADATA_DIR;
if (output) {
  mkdirSync(output, { recursive: true });
  const metadata = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['-c', 'core.fsmonitor=false', 'status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
    version: JSON.parse(readFileSync(join(mobile, 'app.json'), 'utf8')).expo.version,
    generatedAt: new Date().toISOString(),
    artifacts: exportDirs.map((dir) => ({ platform: /android/.test(dir) ? 'android' : /ios/.test(dir) ? 'ios' : 'unknown', type: 'Hermes export (not signed binary)' })),
    buildNumber: null, easBuildId: null, backendDeployment: null,
    environment: 'CI export; no backend contacted', channel: null,
  };
  writeFileSync(join(output, 'release-metadata.json'), JSON.stringify(metadata, null, 2) + '\n');
}
console.log(`Mobile release hygiene passed; scanned ${exportDirs.length} exports. Not a signing or store readiness assertion.`);
