import { z } from "zod";
import { invalidApiInput } from "@/lib/api/input-validation";
import { businessJson, requireBusinessApi } from "@/lib/business/api-guard";
import { getUserBusinessPermissions } from "@/lib/business/access";
import { loadBusinessSectionData } from "@/lib/business/section-data-server";
import { FINANCE_SECTIONS, isBusinessSection, SECTION_PERMISSIONS } from "@/lib/business/sections";
import { toMobileBusinessSection } from "@/lib/mobile/business-views";

const value = z.string().trim().max(191).optional();
const querySchema = z
  .object({
    from: value, to: value, product: value, status: value, temperature: value, ai: value, unread: value, q: value,
    cursor: value, conversation: value, messageCursor: value, focus: value, stage: value, owner: value, source: value,
    interest: value, campaign: value, lead: value,
  })
  .strict();

/**
 * İşletme bölümü (P2.7, mobil) — web `isletme/[section]` ile AYNI yükleyici
 * (`loadBusinessSectionData`), AYNI bölüm izni ve iş birimi kapsamı. Yetkisiz
 * veya kapalı bölüm 404 (alan sızdırılmaz). Yanıt `private, no-store`.
 */
export async function GET(request: Request, context: { params: Promise<{ section: string }> }) {
  const { section } = await context.params;
  if (!isBusinessSection(section)) return businessJson({ error: "Bölüm bulunamadı; kaldırılmış ya da değişmiş olabilir.", code: "NOT_FOUND" }, { status: 404 });
  const auth = await requireBusinessApi(SECTION_PERMISSIONS[section], { finance: FINANCE_SECTIONS.includes(section) });
  if (!auth.ok) return auth.response;
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return invalidApiInput();
  const [data, granted] = await Promise.all([loadBusinessSectionData(auth.access, section, query.data), getUserBusinessPermissions(auth.access.session)]);
  return businessJson(toMobileBusinessSection({ section, data, units: auth.access.units, granted, query: query.data }));
}
