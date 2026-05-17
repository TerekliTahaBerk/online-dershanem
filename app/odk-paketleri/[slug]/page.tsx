import { redirect } from "next/navigation";

// Standalone package detail pages are retired in favour of the unified
// Deneme Kulübü landing. The checkout flow ([slug]/satin-al) is preserved.
export default async function OdkPackageDetailRedirect() {
  redirect("/deneme-kulubu#paketler");
}
