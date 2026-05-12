/* eslint-disable no-console */
const isDev = __DEV__;

/** Üretim build'inde console gürültüsünü minimize eden ince logger. */
export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log("[debug]", ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info("[info]", ...args);
  },
  warn: (...args: unknown[]) => console.warn("[warn]", ...args),
  error: (...args: unknown[]) => console.error("[error]", ...args),
};
