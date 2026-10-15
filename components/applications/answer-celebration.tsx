import type { CSSProperties } from "react";
import styles from "./applications.module.css";

const colors = ["#0c7c57", "#fdd81d", "#ed76a0", "#9171df", "#42b2de"];

/** Finite, deterministic CSS burst. Mount only for a checked, correct answer. */
export function AnswerCelebration() {
  return <div className={styles.confetti} aria-hidden="true">
    {Array.from({ length: 28 }, (_, index) => {
      const angle = index * 2.39996;
      const style = {
        "--burst-x": `${Math.round(Math.cos(angle) * (90 + index % 5 * 27))}px`,
        "--burst-y": `${-95 - index % 7 * 24}px`,
        "--burst-turn": `${180 + index * 31}deg`,
        "--burst-delay": `${index % 5 * 25}ms`,
        backgroundColor: colors[index % colors.length],
      } as CSSProperties;
      return <span key={index} style={style} />;
    })}
  </div>;
}
