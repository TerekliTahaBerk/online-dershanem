import { writeTeacherTemplate } from "@/lib/panel/teacher-template-write";

export const POST = (request: Request) => writeTeacherTemplate(request);
