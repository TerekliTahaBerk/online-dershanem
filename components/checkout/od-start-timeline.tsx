import { OD_START_STEPS, odTimePreferenceLabels } from "@/lib/od/onboarding-customer";

export function OdStartTimeline({ buyerInfo }: { buyerInfo: unknown }) {
  const preferences = odTimePreferenceLabels(buyerInfo);
  return (
    <div>
      <h2 className="font-bold">Sıradaki adımlar</h2>
      <ol className="mt-3 space-y-4">
        {OD_START_STEPS.map((step, index) => <li key={step.title}>
          <p className="font-semibold">{index + 1}. {step.title}</p>
          <p className="mt-1 leading-6">{step.body}</p>
        </li>)}
      </ol>
      {preferences.length > 0 && <p className="mt-4 leading-6">Saat tercihiniz: {preferences.join(" · ")}. Belirli bir grup veya saat ödeme ile garanti edilmez.</p>}
      <p className="mt-3 leading-6">Ayrıca hesap açmanıza gerek yok. Yeni hesabınızın parolasını e-postanızdaki bağlantıyla belirleyebilirsiniz.</p>
    </div>
  );
}
