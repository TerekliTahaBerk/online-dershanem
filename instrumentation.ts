/**
 * Next.js 15 native instrumentation hook.
 * Bir kez çağrılır (cold-start), her request'te değil.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Sadece nodejs runtime'da çalıştır (edge'de prisma yok).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOnce } = await import("./lib/env");
    validateEnvOnce();
  }
}
