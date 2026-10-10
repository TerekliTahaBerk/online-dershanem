import type { MobileMaterial } from '@contracts/student';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Kimlikli materyal dosyaları — saklama politikası:
 *  - Dosya YALNIZ `Authorization: Bearer` başlığıyla indirilir; token URL'e
 *    asla konmaz (`api.authHeaders()`).
 *  - Hedef işletim sisteminin ÖNBELLEK dizinidir (yedeklenmez, sistem
 *    gerektiğinde boşaltabilir), kullanıcıya ayrılmış alt dizinde:
 *    `cache/od-materials/<kullanıcı>/`. Kalıcı belge dizinine yazılmaz.
 *  - Çıkışta / oturum düşünce (`SessionProvider.clearLocalSession`) ve hesap
 *    değişince tüm `od-materials` dizini silinir: bir kullanıcının dosyası
 *    sonraki kullanıcıya kalmaz.
 *  - Dosya adı sunucudan gelse de güvenilmez: yol ayırıcı, `..`, kontrol
 *    karakteri temizlenir; ad materyal kimliğiyle öneklenir.
 */

const ROOT = 'od-materials';
const EXTENSION_BY_MIME: Record<string, string> = { 'application/pdf': '.pdf', 'video/mp4': '.mp4', 'image/png': '.png', 'image/jpeg': '.jpg' };

export function safeFileName(material: Pick<MobileMaterial, 'id' | 'fileName' | 'mimeType' | 'kind'>): string {
  const raw = (material.fileName ?? '').split(/[\\/]/).pop() ?? '';
  const ascii = raw
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+/, '')
    .slice(-80);
  const hasExtension = /\.[A-Za-z0-9]{1,8}$/.test(ascii);
  const extension = hasExtension ? '' : (material.mimeType && EXTENSION_BY_MIME[material.mimeType]) || (material.kind === 'PDF' ? '.pdf' : '');
  const id = material.id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'materyal';
  return `${id}-${ascii || 'materyal'}${extension}`;
}

/** Kullanıcı dizini adı: kimlik yalnız güvenli karakterlerle. */
export function userDirectoryName(userId: string): string {
  return userId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || 'kullanici';
}

export async function downloadMaterialFile(input: { baseUrl: string; path: string; headers: Record<string, string>; userId: string; material: Pick<MobileMaterial, 'id' | 'fileName' | 'mimeType' | 'kind'> }): Promise<File> {
  const directory = new Directory(Paths.cache, ROOT, userDirectoryName(input.userId));
  directory.create({ intermediates: true, idempotent: true });
  const destination = new File(directory, safeFileName(input.material));
  return File.downloadFileAsync(`${input.baseUrl}${input.path}`, destination, { headers: input.headers, idempotent: true });
}

/**
 * Deneme Ligi cevap anahtarı (M4) — materyallerle AYNI politika: yalnız
 * Bearer başlıkla indirilir, kullanıcıya ayrılmış ÖNBELLEK dizinine
 * (`cache/odk-answer-keys/<kullanıcı>/`) yazılır, çıkış / hesap değişiminde
 * silinir. Ad yalnız deneme kimliğinden üretilir (sunucu adına güvenilmez).
 */
const ANSWER_KEY_ROOT = 'odk-answer-keys';

export async function downloadAnswerKeyFile(input: { baseUrl: string; path: string; headers: Record<string, string>; userId: string; examId: string }): Promise<File> {
  const directory = new Directory(Paths.cache, ANSWER_KEY_ROOT, userDirectoryName(input.userId));
  directory.create({ intermediates: true, idempotent: true });
  const id = input.examId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'deneme';
  const destination = new File(directory, `cevap-anahtari-${id}.pdf`);
  return File.downloadFileAsync(`${input.baseUrl}${input.path}`, destination, { headers: input.headers, idempotent: true });
}

/** Tüm kullanıcıların indirilmiş materyallerini ve cevap anahtarlarını siler (çıkış / hesap değişimi). */
export function clearMaterialFiles(): void {
  for (const name of [ROOT, ANSWER_KEY_ROOT]) {
    try {
      const root = new Directory(Paths.cache, name);
      if (root.exists) root.delete();
    } catch {
      // Dizin yoksa veya platform desteklemiyorsa sessizce geçilir; dosyalar
      // önbellekte olduğu için işletim sistemi de temizleyebilir.
    }
  }
}
