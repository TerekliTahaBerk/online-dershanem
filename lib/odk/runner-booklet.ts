/**
 * Çözücü kitapçık görünümü yardımcıları (Faz 5 / P1-2).
 *
 * Tarayıcı PDF görüntüleyicisi `#page=N` parçasıyla istenen sayfayı açar. Parça
 * değişikliği belgeyi yeniden indirmez. Öğrenci kitapçıkta kendisi gezindiyse,
 * aynı sayfadaki bir sonraki soruya geçmek onu geri sıçratmaz: yalnız hedef
 * sayfa DEĞİŞİNCE (ya da öğrenci "Sayfaya git" dediğinde) gezinilir.
 */
export function bookletSrc(base: string, page: number | null | undefined, nonce = 0): string {
  const params = ["toolbar=1", "navpanes=0"];
  if (page && Number.isInteger(page) && page > 0) params.push(`page=${page}`);
  // Aynı sayfaya yeniden gitmek için parça değişmeli; görüntüleyici bilinmeyen anahtarı yok sayar.
  if (nonce > 0) params.push(`odk=${nonce}`);
  return `${base}#${params.join("&")}`;
}

export function shouldFollowPage(previousPage: number | null, nextPage: number | null | undefined): boolean {
  return Boolean(nextPage) && nextPage !== previousPage;
}

/** Ekran okuyucuya duyurulan kalan süre eşikleri (dakika), büyükten küçüğe (Faz 7). */
export const TIME_WARNING_MINUTES = [10, 5, 1] as const;

/**
 * Kalan süre bir eşiğin altına indiyse ve o eşik henüz duyurulmadıysa
 * duyurulacak en küçük eşiği döner. Sayfa geç açıldıysa (ör. 3 dk kala)
 * geçmiş büyük eşikler tek tek okunmaz, yalnız geçerli olan okunur.
 */
export function timeWarningToAnnounce(remainingMs: number, announced: ReadonlySet<number>): number | null {
  const crossed = TIME_WARNING_MINUTES.filter((minutes) => remainingMs > 0 && remainingMs <= minutes * 60_000);
  if (!crossed.length) return null;
  const smallest = crossed[crossed.length - 1];
  return announced.has(smallest) ? null : smallest;
}
