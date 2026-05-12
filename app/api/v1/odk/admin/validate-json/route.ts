import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import {
  validateAnswerKey,
  validateLearningOutcomes,
  crossValidate,
} from "@/lib/odk/validate";

export const dynamic = "force-dynamic";

const Body = z.object({
  answerKey: z.unknown().optional(),
  outcomes: z.unknown().optional(),
});

/**
 * Wizard içinde "Doğrula" butonuna basıldığında çağrılır.
 * Yalnızca parser; DB'ye yazmaz. Admin yetkisi gerekli (sızdırmamak için).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return apiErr("Geçersiz JSON gövdesi.", 400, err);
  }

  const ak = body.answerKey ? validateAnswerKey(body.answerKey) : null;
  const lo = body.outcomes ? validateLearningOutcomes(body.outcomes) : null;
  const cross =
    ak?.ok && lo?.ok && ak.data && lo.data
      ? crossValidate(ak.data, lo.data)
      : null;

  return apiOk({
    answerKey: ak,
    outcomes: lo,
    cross,
  });
}
