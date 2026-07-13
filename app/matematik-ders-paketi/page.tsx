import { permanentRedirect } from "next/navigation";

export default function LegacyMatematikDersPaketiPage() {
  permanentRedirect("/ders-paketleri/");
}
