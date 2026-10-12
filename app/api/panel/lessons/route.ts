import { POST as execute } from "@/lib/panel/education-handlers/lessons";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("lesson", execute);
