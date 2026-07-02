import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  alternates: {
    canonical: "/yks"
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function TYTRedirectPage() {
  permanentRedirect("/yks/");
}
