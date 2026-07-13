const items = [
  ["En fazla 4 öğrenci", "Öğrencinin çözümü görünür"],
  ["Canlı matematik", "Google Meet üzerinden"],
  ["Ders sonrası takip", "Ödev, tekrar ve sıradaki adım"],
  ["Aylık ve taahhütsüz", "PayTR ile güvenli ödeme"],
];

export function SocialProof() {
  return (
    <section className="border-y border-[var(--site-line)] bg-white" aria-label="Doğrulanmış ürün özellikleri">
      <div className="site-container grid sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([title, detail], index) => (
          <div key={title} className={`py-6 sm:px-6 ${index ? "border-t border-[var(--site-line)] sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 lg:border-l" : ""}`}>
            <p className="text-[14px] font-semibold text-[var(--site-ink)]">{title}</p>
            <p className="mt-1 text-[12.5px] leading-5 text-[var(--site-muted)]">{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
