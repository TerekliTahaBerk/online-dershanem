import { deploymentEnvironment, evaluateConfiguration, type DeploymentEnvironment } from "../lib/env-contract";

const targetArgument = process.argv.find((argument) => argument.startsWith("--target="));
const requestedTarget = targetArgument?.slice("--target=".length);
if (requestedTarget && !["development", "preview", "production"].includes(requestedTarget)) {
  console.error(`[configuration] Geçersiz hedef: ${requestedTarget}`);
  process.exit(2);
}

const environment = (requestedTarget as DeploymentEnvironment | undefined) ?? deploymentEnvironment();
const report = evaluateConfiguration({ environment });
const summary = {
  event: "configuration.deploy_validation",
  environment: report.environment,
  status: report.status,
  fingerprint: report.fingerprint,
  blockerCount: report.blockers.length,
  warningCount: report.warnings.length,
  blockers: report.blockers.map(({ key, code }) => ({ key, code })),
  warnings: report.warnings.map(({ key, code }) => ({ key, code })),
};

const serialized = JSON.stringify(summary);
if (report.blockers.length > 0) {
  console.error(serialized);
  process.exit(1);
}

if (report.warnings.length > 0) console.warn(serialized);
else console.log(serialized);
