import { lessonSubjects } from "./package-builder-pricing";

type SearchParams = Record<string, string | string[] | undefined>;

const productNames = new Map([
  ["Online Dershanem", "onlinedershanem."],
  ["Online Koçum", "onlinekoçum."],
  ["Online Deneme Kulübüm", "onlinedenemekulübüm."],
]);

/** Parse the existing builderContactQuery grammar; never echo arbitrary text. */
export function builderContactContext(params: SearchParams) {
  if (typeof params.paket !== "string" || params.paket.length > 600) return null;
  const [productPart, formatPart, lessonPart, ...extra] = params.paket.split(" · ");
  if (extra.length) return null;
  const products = productPart.split(" + ");
  if (products.length > 3 || new Set(products).size !== products.length || products.some((name) => !productNames.has(name))) return null;
  const exam = params.sinav === "LGS" || params.sinav === "YKS" ? params.sinav : null;
  const hasLessons = products.includes("Online Dershanem");
  if (!hasLessons && (formatPart || lessonPart)) return null;
  const format = formatPart === "birebir özel ders" ? "Birebir" : formatPart === "maks. 4 kişilik grup" ? "Maks. 4 kişilik grup" : null;
  if (hasLessons && !format) return null;
  if (lessonPart && !lessonPart.startsWith("dersler: ")) return null;
  const subjects = lessonPart ? lessonPart.slice("dersler: ".length).split(", ") : [];
  if (subjects.length && (!exam || subjects.some((subject) => !lessonSubjects[exam].includes(subject)))) return null;
  return {
    exam,
    products: products.map((name) => productNames.get(name)!),
    format,
    subjects: [...new Set(subjects)],
  };
}
