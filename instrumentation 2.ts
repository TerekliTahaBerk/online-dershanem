/**
 * Next.js 15 native instrumentation hook.
 * Bir kez çağrılır (cold-start), her request'te değil.
 *
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
import type { Instrumentation } from "next";

export async function register() {
  // Sadece nodejs runtime'da çalıştır (edge'de prisma yok).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOnce } = await import("./lib/env");
    validateEnvOnce();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/error-capture");
  await reportError(error, {
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
    routerKind: context.routerKind,
  });
};
