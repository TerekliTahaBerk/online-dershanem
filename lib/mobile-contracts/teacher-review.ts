import { check, v, type Infer } from "./validate";

const review = v.object({ contractVersion: v.literal(1), students: v.array(v.object({ id: v.nonEmpty(), name: v.string(), activeCount: v.int(0), dueCount: v.int(0), persistentCount: v.int(0), lastReviewedAt: v.nullable(v.iso()), revision: v.nonEmpty() })) });
export type TeacherReview = Infer<typeof review>;
export function parseTeacherReview(input: unknown) { return check(review, input); }
