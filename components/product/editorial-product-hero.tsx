import type { ReactNode } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import styles from "./editorial-product-hero.module.css";

type HeroTone = "lesson" | "coaching" | "exam";

export function EditorialProductHero({
  tone,
  titleId,
  lines,
  description,
  actions,
  facts,
  note,
}: {
  tone: HeroTone;
  titleId: string;
  lines: readonly { text: string; emphasis?: string }[];
  description: string;
  actions: ReactNode;
  facts?: readonly { title: string; detail: string }[];
  note?: string;
}) {
  return (
    <section className={`${styles.hero} ${styles[tone]}`} aria-labelledby={titleId}>
      <div className={`site-container ${styles.content}`}>
        <div className={styles.headlineWrap}>
          <Sparkles className={styles.spark} strokeWidth={1.5} aria-hidden="true" />
          <h1 id={titleId} className={styles.headline}>
            {lines.map(({ text, emphasis }) => (
              <span className={styles.line} key={text}>
                {text}{emphasis ? <> <span className={styles.emphasis}>{emphasis}</span></> : null}
              </span>
            ))}
          </h1>
          <ArrowUpRight className={styles.direction} strokeWidth={1.3} aria-hidden="true" />
        </div>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>{actions}</div>
        {facts ? (
          <dl className={styles.facts}>
            {facts.map(({ title, detail }) => (
              <div key={title}><dt>{title}</dt><dd>{detail}</dd></div>
            ))}
          </dl>
        ) : null}
        {note ? <p className={styles.note}>{note}</p> : null}
      </div>
    </section>
  );
}
