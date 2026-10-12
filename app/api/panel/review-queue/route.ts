import { POST as execute } from "@/lib/panel/education-handlers/review";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("review", execute);
