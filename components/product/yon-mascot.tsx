import Image from "next/image";
import { yonBrand } from "@/lib/yon-brand";

/** CSS-free so the existing static-markup catalog tests remain runnable in Node. */
export function YonMascot({ size = 148 }: { size?: 52 | 148 }) {
  return (
    <Image src={yonBrand.mascot} alt="" width={1254} height={1254}
      sizes={`${size}px`} className="rounded-[14px] object-contain"
      style={{ width: size, height: size }} />
  );
}

export function YonCardPreview() {
  return (
    <div className="flex h-[172px] items-center justify-center border-b border-[#CADDF8] bg-[#0754C9]">
      <YonMascot />
    </div>
  );
}
