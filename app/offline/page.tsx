import Link from "next/link";
import { CloudOff } from "lucide-react";

export const metadata = { title: "Bağlantı yok", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return <main className="grid min-h-dvh place-items-center bg-[#fbfaf5] p-6"><section className="w-full max-w-lg rounded-[28px] border border-[#deddd5] bg-white p-7 text-center shadow-sm"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eef2e8] text-[#3a4a2c]"><CloudOff size={25} /></span><h1 className="mt-5 text-2xl font-semibold tracking-[-.04em]">Şu anda bağlantı yok.</h1><p className="mt-3 text-sm leading-6 text-[#4f504a]">Özel panel bilgileri güvenliğiniz için cihaz önbelleğinde gösterilmez. Açık panel sekmenizde izin verdiğiniz işlemler bağlantı gelene kadar bekleyebilir.</p><Link href="/panel" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3a4a2c] px-5 text-sm font-bold text-white">Bağlantıyı yeniden dene</Link></section></main>;
}
