import "server-only";
import { headers } from "next/headers";
import type { SessionUser } from "./session";
import { resolveAdminOverlayTransport } from "./admin-overlay-core";

export async function readAdminOverlayTransport(actor: SessionUser) {
  return resolveAdminOverlayTransport(await headers(), actor);
}
