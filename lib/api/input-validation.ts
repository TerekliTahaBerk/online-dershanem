import { NextResponse } from "next/server";
import { z } from "zod";

const routeIdentifier = z.string().trim().min(1).max(191);

export const idParamsSchema = z.object({ id: routeIdentifier }).strict();
export const fileIdParamsSchema = z.object({ fileId: routeIdentifier }).strict();
export const studentIdParamsSchema = z.object({ studentId: routeIdentifier }).strict();
export const recoveryItemParamsSchema = z
  .object({ id: routeIdentifier, itemId: routeIdentifier })
  .strict();

export function invalidApiInput(message = "Geçersiz istek parametreleri.") {
  return NextResponse.json({ error: message }, { status: 400 });
}
