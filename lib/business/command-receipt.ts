import "server-only";

import { CommandError, runWithReceipt as runCommandWithReceipt } from "@/lib/panel/command-receipt";

/**
 * İŞLETME KOMUT MAKBUZU (P2.7) — ortak çalıştırıcı `lib/panel/command-receipt.ts`.
 * Anahtar biçimi değişmedi: `business-<ad alanı>:<aktör>:<anahtar>`.
 */
export { CommandError as BusinessCommandError };
export type { CommandExecution } from "@/lib/panel/command-receipt";

export function runWithReceipt<R>(input: Parameters<typeof runCommandWithReceipt<R>>[0]) {
  return runCommandWithReceipt<R>({ ...input, namespace: `business-${input.namespace}` });
}
