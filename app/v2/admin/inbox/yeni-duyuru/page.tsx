import { PageHeader } from "@/components/od/page-header";
import { BroadcastForm } from "@/components/od/domain/inbox/broadcast-form";

export default function NewBroadcastPage() {
  return (
    <div className="space-y-od-5">
      <PageHeader
        title="Yeni Duyuru"
        description="Belirlediğiniz role toplu mesaj gönderin"
      />
      <BroadcastForm />
    </div>
  );
}
