/**
 * Phase 2 / Session 16 — Admin inbox now delegates to the shared
 * `/panel/inbox` implementation. The sidebar entry still points here.
 *
 * Kept as a separate route file so we don't break existing nav `href`s.
 * Uses `requirePanelRole("admin")` first to stop non-admins from landing
 * on this URL, then renders the shared page component.
 */
import type { Metadata } from "next";
import { requirePanelRole } from "@/lib/panel-access";
import SharedInboxPage from "@/app/panel/inbox/page";

export const metadata: Metadata = {
  title: "Inbox · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminInbox(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePanelRole("admin");
  return <SharedInboxPage searchParams={props.searchParams} />;
}
