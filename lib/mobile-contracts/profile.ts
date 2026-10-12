import { check, v, type Infer } from './validate';
const profile = v.object({
  fullName: v.nullable(v.string()), email: v.nonEmpty(), targetGoal: v.nullable(v.string()), classLevel: v.nullable(v.string()), parents: v.array(v.string()),
  activeProducts: v.array(v.object({ label: v.nonEmpty(), expiresAt: v.nullable(v.iso()) })),
});
export type StudentProfile = Infer<typeof profile>;
export const parseStudentProfile = (input: unknown) => check(profile, input);
