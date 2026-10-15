import Link from "next/link";
import { applicationProducts } from "@/lib/application-products";
import styles from "./applications.module.css";

export function ApplicationNav({ active }: { active: string }) {
  return <nav aria-label="Uygulamalar arasında geçiş" className={styles.switcher}>
    <div className={`site-container ${styles.switcherInner}`}>
      {applicationProducts.map(p => <Link key={p.href} href={p.href} aria-current={p.href === active ? "page" : undefined}>{p.name}</Link>)}
    </div>
  </nav>;
}
