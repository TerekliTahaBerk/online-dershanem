import { POST as execute } from "@/lib/panel/education-handlers/curriculum-versions";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("version", execute);
