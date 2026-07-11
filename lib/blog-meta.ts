export const blogPublishedAt: Record<string, string> = {
  "online-dershane-nedir": "2026-04-22",
  "online-ozel-ders-mi-dershane-mi": "2026-04-08",
  "yks-online-ders-calisma-plani": "2026-03-25",
  "lgs-online-ders-net-artirma": "2026-03-11",
  "online-dershane-fiyatlari-2026": "2026-02-26",
  "e-dershane-nedir": "2026-02-12",
  "online-ders-calisma-programi": "2026-01-29",
  "ozel-ders-mi-kucuk-grup-mu": "2026-01-15",
  "yks-matematik-net-artirma": "2025-12-18",
  "lgs-matematikte-zorlananlar-icin": "2025-12-04",
  "deneme-analizi-nasil-yapilir": "2025-11-20",
  "online-dershane-secim-rehberi-2026": "2025-11-06",
  "online-ders-disiplini-nasil-kurulur": "2025-10-23",
};

const authorByCategory: Record<string, string> = {
  "Online Dershane": "Online Dershanem Ekibi",
  "Online Özel Ders": "Online Dershanem Ekibi",
  YKS: "Online Dershanem Eğitim Ekibi",
  LGS: "Online Dershanem Eğitim Ekibi",
  "e Dershane": "Online Dershanem Ekibi",
  "Online Ders": "Online Dershanem Eğitim Ekibi",
  "Özel Ders": "Online Dershanem Ekibi",
  "Sınav Stratejisi": "Online Dershanem Eğitim Ekibi",
};

export function getBlogAuthor(category: string): string {
  return authorByCategory[category] ?? "Online Dershanem Ekibi";
}

export function formatBlogDate(iso?: string): string {
  if (!iso) return "Yakın zamanda";
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.valueOf())) return "Yakın zamanda";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

type ReadablePost = {
  title: string;
  excerpt: string;
  sections: ReadonlyArray<{
    h2: string;
    paragraphs?: ReadonlyArray<string>;
    bullets?: ReadonlyArray<string>;
  }>;
};

export function estimateBlogReadingMinutes(post: ReadablePost): number {
  const text = [
    post.title,
    post.excerpt,
    ...post.sections.flatMap((section) => [
      section.h2,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    ]),
  ].join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / 180));
}
