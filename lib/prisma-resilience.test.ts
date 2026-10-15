import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { isTransientPrismaError } from "./prisma-resilience";

test("isTransientPrismaError tanır: P6000 Accelerate", () => {
  const error = new Prisma.PrismaClientKnownRequestError("unreachable", {
    code: "P5006",
    clientVersion: "6.19.3",
    meta: { modelName: "Session" },
  });
  assert.equal(isTransientPrismaError(error), true);
});

test("isTransientPrismaError tanımaz: P2002 unique constraint", () => {
  const error = new Prisma.PrismaClientKnownRequestError("duplicate", {
    code: "P2002",
    clientVersion: "6.19.3",
    meta: { target: ["email"] },
  });
  assert.equal(isTransientPrismaError(error), false);
});

test("isTransientPrismaError tanır: mesajda 530 unreachable", () => {
  const error = new Error(
    'Unknown server error: {"code":"P6000","message":"Query Engine instance was unreachable: 530"}',
  );
  assert.equal(isTransientPrismaError(error), true);
});

test("isTransientPrismaError tanır: kapanmış bağlantı (P1017 ve kodsuz mesaj)", () => {
  const coded = new Prisma.PrismaClientKnownRequestError("Server has closed the connection.", { code: "P1017", clientVersion: "6.19.3" });
  assert.equal(isTransientPrismaError(coded), true);
  assert.equal(isTransientPrismaError(new Error("Invalid `prisma.cronHeartbeat.upsert()` invocation:\n\nServer has closed the connection.")), true);
  assert.equal(isTransientPrismaError(new Error("Unique constraint failed")), false);
});
