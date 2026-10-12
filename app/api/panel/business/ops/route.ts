import { invalidApiInput } from "@/lib/api/input-validation";
import { businessJson, requireBusinessApi } from "@/lib/business/api-guard";
import { BusinessCommandError } from "@/lib/business/command-receipt";
import { OPS_FINANCE, OPS_STEP_UP, opsPermission, opsRequestSchema } from "@/lib/business/ops-commands";
import { runOpsCommand } from "@/lib/business/ops-service";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { PRIVATE_NO_STORE } from "@/lib/panel/parent-api";

/**
 * İşletme pazarlama + finans komutu (P2.7c) — web Server Action'larıyla AYNI
 * servis (`runOpsCommand`), izin ve iş birimi kapsamı. Finans kaydı, ters
 * kayıt ve dönem kilidi taze step-up ister (428); finans bayrağı kapalıyken
 * finans komutları 404. Bearer istekleri işlem anahtarı taşır.
 */
export async function POST(request: Request) {
  const parsed = opsRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return invalidApiInput();
  const { command, idempotencyKey } = parsed.data;
  const auth = await requireBusinessApi(opsPermission(command.type), { stepUp: OPS_STEP_UP.has(command.type), finance: OPS_FINANCE.has(command.type) });
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: `business.ops.${command.type}`, userId: auth.access.session.userId, requireSameOrigin: true, headers: request.headers, rateLimit: { max: 30, windowMs: 60_000 } });
  if (!guard.ok) {
    const response = mutationGuardResponse(guard);
    response.headers.set("Cache-Control", PRIVATE_NO_STORE["Cache-Control"]);
    return response;
  }
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && !idempotencyKey) return businessJson({ error: "Güvenli işlem bilgisi eksik. Görünümü yenileyin.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  if (/^Bearer\s+/i.test(request.headers.get("authorization") ?? "") && (command.type === "knowledge.version" || command.type === "automation.toggle") && !command.expectedRevision) return businessJson({ error: "Kayıt sürümü eksik. Görünümü yenileyin.", code: "PRECONDITION_REQUIRED" }, { status: 400 });
  try {
    return businessJson(await runOpsCommand(auth.access, command, { idempotencyKey }));
  } catch (error) {
    if (error instanceof BusinessCommandError) return businessJson({ error: error.message, code: error.code }, { status: error.status });
    throw error;
  }
}
