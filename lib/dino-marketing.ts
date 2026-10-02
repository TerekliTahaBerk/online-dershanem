/** Açık özellik de sınırlı pilotu anlatır; genel erişim vaadi vermez. */
export function getDinoMarketingCopy(enabled: boolean) {
  return enabled
    ? {
        navLabel: "Dino AI · Pilot",
        status: "Sınırlı pilot",
        headline: "Dino AI ile ders, plan ve deneme desteğini pilotta deniyoruz.",
        description: "Dino AI sınırlı pilotta öğretmen ve koçun kararını desteklemek için deneniyor. Erişim, pilot kapsamına göre panelinde görünür; ayrı satılan bir ürün değildir.",
      }
    : {
        navLabel: "Dino AI · Yakında",
        status: "Yakında",
        headline: "Ders, plan ve deneme desteği için Dino AI hazırlanıyor.",
        description: "Dino AI için pilot hazırlıkları sürüyor. Kendi verinden üretilen çıktılar henüz yayında değil; hazır olduğunda panelinde görünecek. Ayrı satılan bir ürün değildir.",
      };
}
