import { sanitizeIncomingPath } from '@/navigation/route-map';

/**
 * Sistemden gelen her derin bağlantı (`onlinedershanem://…`) önce buradan
 * geçer: yalnız izinli rotalar kabul edilir, sorgu dizesi (token, kod vb.)
 * atılır, bilinmeyen yol ana ekrana düşer. Kimlik / kapı kontrolleri kök
 * navigatördeki korumalarla ayrıca yapılır.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return sanitizeIncomingPath(path);
}
