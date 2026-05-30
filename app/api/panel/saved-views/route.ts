/**
 * SavedView REST endpoints.
 *
 *   GET  /api/panel/saved-views?scope=students         → owner's + shared views
 *   POST /api/panel/saved-views                        body: { scope, name, filter, isShared? }
 *
 * Permission policy:
 * - Any panel session may read/write their own views.
 * - `isShared: true` views are visible to anyone in the same scope (read-only
 *   for non-owners). Only owners can mutate.
 * - `scope` is a free-string namespace agreed by the consuming UI ("students",
 *   "lessons", "homework", "attendance", "payments", "audit", ...).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-access";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ScopeSchema = z.string().min(1).max(40).regex(/^[a-z0-9_:-]+$/i);

const CreateSchema = z.object({
  scope: ScopeSchema,
  name: z.string().min(1).max(80),
  filter: z.record(z.string(), z.unknown()),
  isShared: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const ctx = await requirePanelSession();
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "";
  const parsed = ScopeSchema.safeParse(scope);
  if (!parsed.success) return NextResponse.json({ error: "bad_scope" }, { status: 400 });

  const views = await prisma.savedView.findMany({
    where: {
      scope: parsed.data,
      OR: [{ ownerId: ctx.userId }, { isShared: true }],
    },
    orderBy: [{ isShared: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, filter: true, isShared: true, ownerId: true,
      createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({
    views: views.map((v) => ({
      ...v,
      isOwner: v.ownerId === ctx.userId,
    })),
  });
}

export async function POST(request: Request) {
  const ctx = await requirePanelSession();
  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }
  // Only ADMIN can create shared views (avoid noise from every teacher).
  const isShared = parsed.data.isShared && ctx.actualRole === "ADMIN";

  const created = await prisma.savedView.create({
    data: {
      ownerId: ctx.userId,
      scope: parsed.data.scope,
      name: parsed.data.name,
      filter: parsed.data.filter as Prisma.InputJsonValue,
      isShared,
    },
    select: {
      id: true, name: true, filter: true, isShared: true, ownerId: true,
      createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json({ view: { ...created, isOwner: true } });
}
