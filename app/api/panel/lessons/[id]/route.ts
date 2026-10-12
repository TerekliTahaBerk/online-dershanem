import { PATCH as execute } from "@/lib/panel/education-handlers/lessons-id";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const PATCH = educationWriteHandler("lesson", execute);
