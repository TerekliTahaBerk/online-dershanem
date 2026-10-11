import { NextResponse } from "next/server";
import { GroupMutationError } from "./group-mutation-core";
import { groupLifecycleHttpError } from "./group-route-contract";

export function groupMutationHttpError(error: unknown): Response {
  const mapped = error instanceof GroupMutationError ? { status: error.status, code: error.code, message: error.message } : groupLifecycleHttpError(error);
  if (!mapped) throw error;
  return NextResponse.json({ error: mapped.message, code: mapped.code }, { status: mapped.status, headers: { "Cache-Control": "private, no-store" } });
}
