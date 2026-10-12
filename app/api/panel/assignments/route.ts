import { POST as execute } from "@/lib/panel/education-handlers/assignments";
import { educationWriteHandler } from "@/lib/panel/education-write";
export { GET } from "@/lib/panel/education-handlers/assignments";
export const POST = educationWriteHandler("assignment", execute);
