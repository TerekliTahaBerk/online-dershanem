/**
 * Boş durum.
 *
 * Panel açıldığı gün HER ekran boş olacak: ders yok, not yok, ödev yok. Yani
 * boş durum sonradan eklenecek bir süs değil, ilk günün asıl ekranı.
 *
 * Kural: asla "Veri bulunamadı" deme. Ne olduğunu ve SONRA NE OLACAĞINI söyle.
 */
export function PanelEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-[var(--site-line)] bg-white px-6 py-14 text-center">
      <h1 className="mx-auto max-w-[24ch] text-balance text-[19px] font-semibold leading-[1.3] tracking-[-.01em] text-[var(--site-ink)]">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-6 text-[var(--site-body)]">{body}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
