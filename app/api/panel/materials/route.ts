import { POST as execute } from "@/lib/panel/education-handlers/materials";
import { educationWriteHandler } from "@/lib/panel/education-write";
export { GET } from "@/lib/panel/education-handlers/materials";
export const POST = educationWriteHandler("material", execute);
