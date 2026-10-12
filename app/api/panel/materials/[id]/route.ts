import { PATCH as execute } from "@/lib/panel/education-handlers/materials-id";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const PATCH = educationWriteHandler("material", execute);
