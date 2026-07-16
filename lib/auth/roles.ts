import type { UserRole } from "@prisma/client";

/**
 * Rol → panel eşlemesi.
 *
 * Bu dosya BİLEREK bağımlılıksızdır (yalnızca tip import'u, o da derlemede
 * silinir). Hem server component'ler hem middleware buradan okuyabilsin diye
 * `server-only` işaretlenmemiştir.
 */

/**
 * Panelin kökü. Bu bir SAYFA DEĞİL, yönlendiricidir: oturumdaki rolü okuyup
 * kullanıcıyı kendi paneline gönderir. "Kişi mailine göre atalı olduğu panele
 * atılır" davranışı burada gerçekleşir.
 */
export const PANEL_ROOT = "/panel";

/** Geçici parolayla giren kullanıcı buraya kilitlenir; değiştirmeden başka sayfa açamaz. */
export const PASSWORD_CHANGE_PATH = "/panel/parola";

/** Giriş ekranı. Panel kapalıyken burası "yenileniyor" mesajı gösterir. */
export const LOGIN_PATH = "/giris";

/**
 * Her rolün panel kökü.
 *
 * `Record<UserRole, string>` bilinçli: şemaya yeni bir rol eklendiğinde burası
 * DERLEME HATASI verir. Yeni rolün sessizce yönlendirmesiz kalması, en can
 * sıkıcı hata türüdür — tip sistemi bunu yakalasın.
 */
const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: "/panel/yonetim",
  TEACHER: "/panel/ogretmen",
  STUDENT: "/panel/ogrenci",
  PARENT: "/panel/veli",
};

export function rolePath(role: UserRole): string {
  return ROLE_HOME[role];
}

/** Menüde/başlıkta gösterilecek okunabilir rol adı. */
const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Yönetim",
  TEACHER: "Öğretmen",
  STUDENT: "Öğrenci",
  PARENT: "Veli",
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABEL[role];
}
