import { z } from "zod";

export const inboxCategoryEnum = z.enum([
  "SYSTEM",
  "FINANCE",
  "EDUCATION",
  "ANNOUNCEMENT",
  "TEACHER_MESSAGE",
  "ATTENDANCE",
  "ASSIGNMENT",
]);

export const inboxPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const inboxListFilterSchema = z.object({
  recipientUserId: z.string().optional(),
  category: inboxCategoryEnum.optional(),
  priority: inboxPriorityEnum.optional(),
  search: z.string().trim().max(120).optional(),
  unreadOnly: z.boolean().optional(),
  archived: z.boolean().optional(),
  take: z.number().int().min(1).max(200).default(50),
  skip: z.number().int().min(0).default(0),
});

export type InboxListFilter = z.infer<typeof inboxListFilterSchema>;

export const inboxIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export const inboxBroadcastSchema = z.object({
  recipientRole: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT", "ALL"]),
  category: inboxCategoryEnum.default("ANNOUNCEMENT"),
  priority: inboxPriorityEnum.default("NORMAL"),
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(5000),
  href: z.string().url().or(z.string().startsWith("/")).optional(),
});

export type InboxBroadcastInput = z.infer<typeof inboxBroadcastSchema>;
