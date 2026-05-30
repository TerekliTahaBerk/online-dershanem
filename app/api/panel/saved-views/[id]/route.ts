/**
 * SavedView item endpoints — update / delete a single saved view.
 *
 *   PATCH  /api/panel/saved-views/:id   body: partial { name, filter, isShared }
 *   DELETE /api/panel/saved-views/:id
 *
 * Only the owner can mutate. Admins can mutate any view (their own or shared).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  isShared: z.boolean().optional(),
});

async function loadOwned(id: string, ctx: { userId: string; actualRole: string }) {
  const view = await prisma.savedView.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!view) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) } as const;
  if (view.ownerId !== ctx.userId && ctx.actualRole !== "ADMIN") {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) } as const;
  }
  return { view } as const;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePanelSession();
  const { id } = await params;
  const owned = await loadOwned(id, ctx);
  if ("error" in owned) return owned.error;

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const data: Prisma.SavedViewUpdateInput = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.filter !== undefined) data.filter = parsed.data.filter as Prisma.InputJsonValue;
  if (parsed.data.isShared !== undefined && ctx.actualRole === "ADMIN") {
    data.isShared = parsed.data.isShared;
  }

  const updated = await prisma.savedView.update({
    where: { id },
    data,
    select: { id: true, name: true, filter: true, isShared: true, ownerId: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ view: { ...updated, isOwner: updated.ownerId === ctx.userId } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePanelSession();
  const { id } = await params;
  const owned = await loadOwned(id, ctx);
  if ("error" in owned) return owned.error;
  await prisma.savedView.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
