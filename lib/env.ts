/** Runtime configuration snapshot. Deployment blocking lives in validate:deploy-env. */
import "server-only";

import { evaluateConfiguration, type ConfigurationReport } from "@/lib/env-contract";

let status: ConfigurationReport | null = null;

export function validateEnvOnce(): ConfigurationReport {
  status ??= evaluateConfiguration();
  return status;
}
