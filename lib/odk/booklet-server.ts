import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { transactionalAudit } from "@/lib/panel/education-write";
import { bookletCodesOf, validateBookletOrders, type BookletOrderInput } from "@/lib/odk/booklets";

/**
 * Çoklu kitapçık sıra tablosu (B–E) — yalnız taslak sürümde yazılır. Önizleme
 * doğrular ve güncel tablonun hash'ini döner; kayıt aynı hash'le ve aynı
 * transaction'da tabloyu atomik olarak değiştirir (boş liste = tek kitapçık).
 */
type Db = PrismaClient;

export async function loadBookletSetup(db: Pick<Db, "odkExam">, examId: string) {
  const exam = await db.odkExam.findUnique({
    where: { id: examId },
    select: {
      status: true,
      currentVersion: {
        select: {
          id: true,
          status: true,
          sections: { orderBy: { position: "asc" }, select: { id: true, code: true, title: true, questions: { where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, questionNumber: true } } } },
          bookletOrders: { select: { bookletCode: true, questionId: true, sectionId: true, bookletQuestionNumber: true, bookletPage: true } },
        },
      },
    },
  });
  if (!exam?.currentVersion) return null;
  const version = exam.currentVersion;
  const questions = version.sections.flatMap((section) => section.questions.map((question) => ({ id: question.id, sectionId: section.id, sectionCode: section.code, questionNumber: question.questionNumber })));
  return { exam, version, questions, orders: version.bookletOrders, codes: bookletCodesOf(version.bookletOrders) };
}

export function bookletOrdersHash(orders: ReadonlyArray<{ bookletCode: string; questionId: string; bookletQuestionNumber: number; bookletPage: number | null }>) {
  const rows = [...orders].map((row) => [row.bookletCode, row.questionId, row.bookletQuestionNumber, row.bookletPage]).sort((a, b) => String(a).localeCompare(String(b)));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

function summary(orders: ReadonlyArray<{ bookletCode: string }>) {
  return bookletCodesOf(orders).map((code) => ({ code, questionCount: orders.filter((row) => row.bookletCode === code).length }));
}

export async function previewBookletOrders(examId: string, rows: BookletOrderInput[], db: Db = prisma) {
  const setup = await loadBookletSetup(db, examId);
  if (!setup) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  const result = validateBookletOrders(setup.questions, rows);
  return NextResponse.json({ ok: result.issues.length === 0, issues: result.issues, booklets: summary(result.orders), currentHash: bookletOrdersHash(setup.orders) });
}

class BookletStaleError extends Error {}

export async function replaceBookletOrders(examId: string, input: { rows: BookletOrderInput[]; expectedHash: string }, actorId: string, db: Db = prisma) {
  const setup = await loadBookletSetup(db, examId);
  if (!setup) return NextResponse.json({ error: "Deneme bulunamadı." }, { status: 404 });
  if (setup.exam.status !== "DRAFT" || setup.version.status !== "DRAFT") return NextResponse.json({ error: "Kitapçık sırası yalnız taslak sürümde değiştirilebilir." }, { status: 409 });
  const result = validateBookletOrders(setup.questions, input.rows);
  if (result.issues.length) return NextResponse.json({ error: result.issues[0].message, issues: result.issues }, { status: 400 });
  const versionId = setup.version.id;
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM odk_exam_versions WHERE id = ${versionId} FOR UPDATE`;
      const current = await tx.odkBookletQuestionOrder.findMany({ where: { versionId }, select: { bookletCode: true, questionId: true, bookletQuestionNumber: true, bookletPage: true } });
      if (bookletOrdersHash(current) !== input.expectedHash) throw new BookletStaleError();
      await tx.odkBookletQuestionOrder.deleteMany({ where: { versionId } });
      if (result.orders.length) await tx.odkBookletQuestionOrder.createMany({ data: result.orders.map((row) => ({ ...row, versionId })) });
    });
  } catch (error) {
    if (error instanceof BookletStaleError) return NextResponse.json({ error: "Önizlemeden sonra kitapçık sırası değişti. Yeniden önizleyin.", code: "BOOKLET_STALE" }, { status: 409 });
    throw error;
  }
  await transactionalAudit(db)({ actorUserId: actorId, entityType: "OdkExam", entityId: examId, action: "odk.booklet_orders_updated", summary: `Kitapçık sırası güncellendi (${bookletCodesOf(result.orders).join(", ")})`, payload: { booklets: summary(result.orders) } });
  return NextResponse.json({ ok: true, booklets: summary(result.orders), currentHash: bookletOrdersHash(result.orders) });
}
