import { POST as execute } from "@/lib/panel/education-handlers/assignment-submissions-id-review";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const POST = educationWriteHandler("submission", execute);
