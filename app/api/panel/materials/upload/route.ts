import { POST as execute } from "@/lib/panel/education-handlers/materials-upload";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("material", execute);
