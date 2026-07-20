import cases from "../evals/teacher-ai-gold-v1.json";
import { buildSafeTeacherAiSource, validateTeacherAiOutput, type TeacherAiSource } from "../lib/teacher-ai";
import { generateTeacherAiDraft } from "../lib/teacher-ai-gateway";

async function main() {
  let failed = 0;
  for (const item of cases) {
    const prepared = buildSafeTeacherAiSource(item.input as TeacherAiSource, "knownNames" in item ? item.knownNames : []);
    const forceFallbackReason = process.env.AI_EVAL_ACKNOWLEDGE_COST === "true" ? (prepared.injectionDetected ? "PROMPT_INJECTION" : undefined) : "EVAL_OFFLINE";
    const result = await generateTeacherAiDraft(prepared.safe, { forceFallbackReason });
    const validation = validateTeacherAiOutput(result.content, prepared.safe.sources.map((source) => source.id));
    const assertions = [validation.ok, !("expectInjection" in item && item.expectInjection) || prepared.injectionDetected, !("expectRedaction" in item && item.expectRedaction) || prepared.redactionCount > 0];
    const ok = assertions.every(Boolean); if (!ok) failed += 1;
    process.stdout.write(`${ok ? "PASS" : "FAIL"} ${item.id} provider=${result.provider} citations=${result.content.citations.length} redactions=${prepared.redactionCount}\n`);
  }
  if (failed) process.exitCode = 1;
}

void main();
