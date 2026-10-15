import Image from "next/image";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import type { applicationProducts } from "@/lib/application-products";
import styles from "./applications-menu.module.css";

type ApplicationProduct = (typeof applicationProducts)[number];

export function ApplicationMenuItem({ product, active, onNavigate }: {
  product: ApplicationProduct;
  active: boolean;
  onNavigate: () => void;
}) {
  const tone = product.shortName === "Mobil" ? "mobile" : product.shortName === "Bilgin" ? "bilgin" : "dino";
  return (
    <div className={styles.item} data-tone={tone} data-active={active || undefined}>
      <Link href={product.href} onClick={onNavigate} aria-label={product.name}
        aria-current={active ? "page" : undefined} className={styles.link}>
        <span className={styles.icon} aria-hidden="true">
          {tone === "mobile" ? <Image src="/design/od-logo.png" alt="" width={30} height={30} />
            : tone === "bilgin" ? <BookOpen size={23} strokeWidth={1.8} /> : <Sparkles size={23} strokeWidth={1.8} />}
        </span>
        <span>{product.name}</span>
        {product.status === "Yakında" && <span className={styles.badge}>Yakında</span>}
      </Link>
      <p className={styles.summary}>{product.summary}</p>
    </div>
  );
}
