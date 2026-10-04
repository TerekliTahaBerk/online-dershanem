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
    <div className="rounded-od px-3 py-2.5 transition-colors hover:bg-purple-50">
      <Link
        href={denemeLigiBrand.href}
        onClick={onNavigate}
        aria-label={denemeLigiBrand.name}
        aria-current={active ? "page" : undefined}
        className="block rounded-sm text-[13px] font-semibold leading-normal text-(--dc-ink) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-700"
      >
        <span>onlinedenemekulübüm. X </span>
        <span className="inline-flex items-center gap-1 align-middle text-purple-800">
          <span>Deneme Ligi</span>
          <Image
            src="/deneme-ligi/mascot-d.png"
            alt=""
            width={1254}
            height={1254}
            sizes="18px"
            className="h-[18px] w-[18px] shrink-0 rounded-[4px] object-contain"
          />
        </span>
      </Link>
      <span className="mt-0.5 block text-[13px] leading-normal text-(--dc-ink-muted)">
        {summary}
      </span>
    </div>
  );
}
