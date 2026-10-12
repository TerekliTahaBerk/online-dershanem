import { PATCH as execute } from "@/lib/panel/education-handlers/curriculum-versions-id";
import { educationWriteHandler } from "@/lib/panel/education-write";
export const PATCH = educationWriteHandler("version", execute);
