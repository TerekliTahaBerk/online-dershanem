import Image from "next/image";
import Link from "next/link";
import { denemeLigiBrand } from "@/lib/deneme-ligi-brand";

type DenemeLigiMenuItemProps = {
  active: boolean;
  onNavigate: () => void;
  summary: string;
};

export function DenemeLigiMenuItem({
  active,
  onNavigate,
  summary,
}: DenemeLigiMenuItemProps) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors hover:border-purple-300 hover:bg-purple-100/70 ${
        active
          ? "border-purple-200 bg-purple-50"
          : "border-purple-100 bg-purple-50/60"
      }`}
    >
      <Link
        href={denemeLigiBrand.href}
        onClick={onNavigate}
        aria-label={denemeLigiBrand.name}
        aria-current={active ? "page" : undefined}
        className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-700"
      >
        <Image
          src="/deneme-ligi/mascot-d.png"
          alt=""
          width={1254}
          height={1254}
          sizes="44px"
          className="h-11 w-11 shrink-0 rounded-xl object-contain shadow-sm"
        />
        <span className="min-w-0 leading-tight">
          <span className="block wrap-break-word text-[12px] font-medium text-purple-900/80">
            onlinedenemekulübüm.
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[17px] font-bold text-purple-800">
            <span className="text-[12px] font-medium text-purple-700/70">X</span>
            <span>Deneme Ligi</span>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
          </span>
        </span>
      </Link>
      <span className="ml-14 mt-1 block text-[12px] leading-normal text-purple-900/80">
        {summary}
      </span>
    </div>
  );
}
