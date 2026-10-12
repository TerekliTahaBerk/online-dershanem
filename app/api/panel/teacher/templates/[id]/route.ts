import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { writeTeacherTemplate } from "@/lib/panel/teacher-template-write";

async function write(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = idParamsSchema.safeParse(await context.params);
  if (!params.success) return invalidApiInput();
  return writeTeacherTemplate(request, params.data.id);
}
export const DELETE = write;
export const PATCH = write;
