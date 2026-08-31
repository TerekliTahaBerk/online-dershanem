/**
 * İlk ADMIN hesabını açar.
 *
 * NEDEN VAR: Panelde hesabı yalnızca admin açabiliyor — yumurta-tavuk. İlk
 * admin buradan doğar. Sonraki bütün hesaplar (öğretmen, öğrenci, veli) panel
 * üzerinden açılır; bu script'e bir daha ihtiyaç olmaz.
 *
 * Parola env'de TUTULMAZ: script üretir, bir kez ekrana basar. Ekrandan alıp
 * kullanıcıya iletirsiniz; ilk girişte değiştirmek zorunda kalır.
 *
 * Kullanım:
 *   npx tsx scripts/create-admin.ts --email=ad@ornek.com --name="Ad Soyad"
 *
 * Canlıya karşı (DATABASE_URL Accelerate olduğu için DIRECT_URL şart):
 *   vercel env pull .env.production.local --environment production --yes
 *   DATABASE_URL="<DIRECT_URL>" npx tsx scripts/create-admin.ts --email=...
 *   rm .env.production.local
 */
import { PrismaClient } from "@prisma/client";
import { generateTemporaryPassword, hashPassword } from "../lib/auth/password";
import { isPlausibleEmail, normalizeEmail } from "../lib/auth/email";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const rawEmail = arg("email");
  const name = arg("name") ?? null;

  if (!rawEmail) {
    console.error("Hata: --email zorunlu.\n  npx tsx scripts/create-admin.ts --email=ad@ornek.com --name=\"Ad Soyad\"");
    process.exit(1);
  }

  const email = normalizeEmail(rawEmail);
  if (!isPlausibleEmail(email)) {
    console.error(`Hata: e-posta geçersiz görünüyor: ${email}`);
    process.exit(1);
  }

  // Hangi veritabanına yazdığımızı göster — yanlışlıkla canlıya yazmak kolay.
  const url = process.env.DATABASE_URL ?? "";
  let where = "bilinmiyor";
  try {
    const u = new URL(url);
    where = `${u.protocol}//${u.hostname}${u.pathname}`;
  } catch {
    /* biçimi tanınmadı; yine de devam */
  }
  console.log(`Veritabanı : ${where}`);

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`\nBu e-posta zaten kayıtlı: ${email} (rol: ${existing.role})`);
      console.log("Hiçbir şey değiştirilmedi. Parola sıfırlamak için panelden yapın.");
      return;
    }

    // Otomasyonlarda ADMIN_PASSWORD stdin/env üzerinden verilebilir; komut
    // argümanına yazılmaz (shell geçmişi ve süreç listesinde görünmesin).
    // Yine de ilk girişte değiştirme zorunludur.
    const suppliedPassword = process.env.ADMIN_PASSWORD;
    const tempPassword = suppliedPassword || generateTemporaryPassword();
    const user = await prisma.user.create({
      data: {
        email,
        fullName: name,
        role: "ADMIN",
        passwordHash: await hashPassword(tempPassword),
        mustChangePassword: true,
        inviteAcceptedAt: new Date(),
      },
    });

    console.log(`\n✓ Admin oluşturuldu: ${user.email}`);
    if (suppliedPassword) {
      console.log("\n  Ortamdan verilen ilk giriş parolası kaydedildi.\n");
    } else {
      console.log("\n  ┌──────────────────────────────────────────────┐");
      console.log(`  │  Geçici parola:  ${tempPassword.padEnd(26)}│`);
      console.log("  └──────────────────────────────────────────────┘\n");
      console.log("  Bu parola BİR KEZ gösterilir; hiçbir yerde saklanmıyor.");
    }
    console.log("  İlk girişte değiştirmek zorunludur.");
    console.log("  Panel kapalıysa giriş için: PANEL_ENABLED=true\n");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Beklenmeyen hata:", error);
  process.exit(1);
});
