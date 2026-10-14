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
