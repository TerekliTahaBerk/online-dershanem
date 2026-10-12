import { PATCH as execute } from "@/lib/panel/education-handlers/assignments-id";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const PATCH = educationWriteHandler("assignment", execute);
