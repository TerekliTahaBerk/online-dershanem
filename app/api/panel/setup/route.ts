import { POST as execute } from "@/lib/panel/education-handlers/setup";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("setup", execute);
