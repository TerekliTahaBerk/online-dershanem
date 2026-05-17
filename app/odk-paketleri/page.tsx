import { redirect } from "next/navigation";

// Old listing page is now consolidated under /deneme-kulubu.
export default function OdkPaketleriRedirect() {
  redirect("/deneme-kulubu#paketler");
}
