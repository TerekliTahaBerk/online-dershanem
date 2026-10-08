/**
 * Rol bölümü içindeki geçişler için anında yükleme iskeleti.
 *
 * Kabuğu sayfalar kendileri çizdiği için `/panel/loading.tsx` yalnız panele
 * DIŞARIDAN girişte devreye girer; aynı rolün sayfaları arasında gezinirken
 * değişen segment bu klasörün altındadır. Buradaki sınır olmadan dinamik
 * sayfalar ön yüklenemez ve tıklama, sunucu yanıtı gelene kadar tepkisiz
 * görünür.
 */
export { default } from "@/app/panel/loading";
