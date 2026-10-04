import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { application } from "@/lib/application";

export const metadata: Metadata = {
  title: "Başvuru",
  robots: { index: false, follow: false },
};

/** Eski kayıt bağlantıları da aynı başvuru yoluna yönlenir. */
export default function RegisterPage() {
  redirect(application.href);
}
