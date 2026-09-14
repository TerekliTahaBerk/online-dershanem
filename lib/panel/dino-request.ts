import { z } from "zod";
import { dinoAudienceSchema } from "@/lib/dino";

export const dinoRequestSchema = z.object({
  audience: dinoAudienceSchema, questionKey: z.string().min(1).max(60), studentId: z.string().min(1).max(80).optional(), requestKey: z.string().uuid(),
}).strict();

export const dinoRedactionBand = (count: number) => count === 0 ? "0" : count <= 2 ? "1-2" : "3+";
export const dinoLatencyBand = (ms: number) => ms <= 2_000 ? "0-2S" : ms <= 8_000 ? "2-8S" : "8S+";

export function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}
