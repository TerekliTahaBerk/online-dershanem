import "server-only";

import { createHash } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { log } from "@/lib/logger";

function opaqueReference(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/** Denied access is observable without placing raw user/resource IDs in logs. */
export function logResourceAccessDenied(input: {
  actorUserId: string;
  role: UserRole;
  resourceType: string;
  resourceId: string;
  reason: "outside_scope" | "inactive" | "missing_blob";
}) {
  log.warn("security.resource_access_denied", {
    actorRef: opaqueReference(input.actorUserId),
    role: input.role,
    resourceType: input.resourceType,
    resourceRef: opaqueReference(input.resourceId),
    reason: input.reason,
  });
}

export function logPrivateMaterialAccessed(input: {
  actorUserId: string;
  role: UserRole;
  materialId: string;
}) {
  log.info("security.private_material_accessed", {
    actorRef: opaqueReference(input.actorUserId),
    role: input.role,
    materialRef: opaqueReference(input.materialId),
  });
}
