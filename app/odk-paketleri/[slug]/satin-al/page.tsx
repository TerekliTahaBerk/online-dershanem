import { redirect } from "next/navigation";

/**
 * Deneme Kulübü şu anda satışta değildir. Mevcut siparişlerin ödeme, sonuç ve
 * PayTR callback rotaları korunur; yalnızca yeni checkout başlangıcı kapalıdır.
 */
export default function OdkCheckoutDisabledPage() {
  redirect("/deneme-kulubu/");
}
