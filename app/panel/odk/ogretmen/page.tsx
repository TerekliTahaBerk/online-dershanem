import { requireTeacherStaffPermission } from "@/lib/auth/guards";
import { OdkHome } from "@/components/odk/odk-home";

export const dynamic = "force-dynamic";

export default async function OdkTeacherHomePage() {
  return <OdkHome session={await requireTeacherStaffPermission("odk:report:read_related")} />;
}
