import { POST as execute } from "@/lib/panel/education-handlers/curriculum-outcomes";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("outcome", execute);
