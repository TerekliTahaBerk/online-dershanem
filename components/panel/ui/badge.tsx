type Tone = "accent" | "ok" | "warn" | "bad" | "purple" | "teal" | "neutral";

type Props = {
  tone?: Tone;
  children: React.ReactNode;
};

export function Badge({ tone = "neutral", children }: Props) {
  return <span className={`od-badge od-badge-${tone}`}>{children}</span>;
}
