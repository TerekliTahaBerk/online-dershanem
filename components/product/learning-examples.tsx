"use client";

import { useState } from "react";

/** Illustrative educational examples. No personal data, service guarantees or API calls. */
export function WeeklyPlanExample() {
  const [day, setDay] = useState(0);
  const days = [
    { name: "Pazartesi", subject: "Türkçe · Paragraf", task: "20 dakika soru çözümü, ardından yanlışların nedenini not et.", focus: "Süreyi tanı" },
    { name: "Çarşamba", subject: "Matematik · Konu tekrarı", task: "Zorlandığın bir konuyu tekrar et, çözüm adımlarını kendi cümlelerinle açıkla.", focus: "Eksiğini çalış" },
    { name: "Cuma", subject: "Fen · Deneme değerlendirmesi", task: "Yanlış ve boşlarını konuya göre ayır. Koçunla gelecek haftanın önceliğini konuş.", focus: "Planını güncelle" },
  ];
  return <div className="rounded-dc-card border border-[#CADDF8] bg-[#EFF6FF] p-5 sm:p-7">
    <h3 className="text-xl font-bold text-[#04112B]">Haftanı adım adım planla</h3>
    <p className="mt-2 text-sm leading-relaxed text-[#344564]">Temsili plan · Gerçek öğrenci verisi veya ürün ekranı değildir.</p>
    <div role="group" aria-label="Örnek çalışma günü" className="mt-5 flex flex-wrap gap-2">
      {days.map((item, index) => <button key={item.name} type="button" aria-pressed={day === index} onClick={() => setDay(index)} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${day === index ? "border-[#0754C9] bg-[#0754C9] text-white" : "border-[#CADDF8] bg-white text-[#0754C9]"}`}>{item.name}</button>)}
    </div>
    <div aria-live="polite" aria-atomic="true" className="mt-5 min-h-44 rounded-2xl bg-white p-5">
      <p className="text-xs font-bold text-[#0754C9]">{days[day].focus}</p>
      <h4 className="mt-3 text-lg font-bold text-[#04112B]">{days[day].subject}</h4>
      <p className="mt-3 text-[15px] leading-relaxed text-[#344564]">{days[day].task}</p>
    </div>
    <p className="mt-4 text-sm leading-relaxed text-[#344564]">Kendi planın hedeflerine, okul saatlerine ve ihtiyaçlarına göre koçunla hazırlanır.</p>
  </div>;
}

export function ExamAnalysisExample() {
  const [exam, setExam] = useState<"LGS" | "TYT" | "AYT">("LGS");
  const data = {
    LGS: { rows: [["Türkçe", "14"], ["Matematik", "10"], ["Fen bilimleri", "12"]], next: "Matematikte zorlandığın konuyu belirle; sonraki çalışmana kısa bir tekrar ekle." },
    TYT: { rows: [["Türkçe", "26"], ["Temel matematik", "18"], ["Fen bilimleri", "10"]], next: "Boş bıraktığın matematik sorularını süre ve konu eksiği açısından ayrı değerlendir." },
    AYT: { rows: [["Matematik", "22"], ["Fizik", "8"], ["Kimya", "9"]], next: "Alan derslerindeki yanlışlarını konuya göre grupla; önceliğini çalışma planına taşı." },
  };
  return <figure className="rounded-dc-card border border-[#E9E1F3] bg-white p-5 sm:p-8">
    <figcaption className="text-xl font-bold text-[#350775]">Sonucunu çalışmana dönüştür</figcaption>
    <p className="mt-2 text-sm leading-relaxed text-[#59446D]">Temsili analiz · Seçili dersler gösterilir; gerçek öğrenci verisi ve sonuç garantisi değildir.</p>
    <div role="group" aria-label="Örnek analiz sınavı" className="mt-5 flex flex-wrap gap-2">
      {(["LGS", "TYT", "AYT"] as const).map(item => <button key={item} type="button" aria-pressed={exam === item} onClick={() => setExam(item)} className={`min-h-11 rounded-full border px-5 text-sm font-bold ${exam === item ? "border-[#5B2599] bg-[#5B2599] text-white" : "border-[#E9E1F3] text-[#5B2599]"}`}>{item}</button>)}
    </div>
    <div aria-live="polite" aria-atomic="true" className="mt-5 min-h-64">
      <table className="w-full text-left text-sm"><caption className="sr-only">{exam} için temsili ders netleri</caption><thead><tr><th scope="col" className="py-3 text-[#59446D]">Ders</th><th scope="col" className="py-3 text-right text-[#59446D]">Örnek net</th></tr></thead><tbody>{data[exam].rows.map(([name, net]) => <tr key={name} className="border-t border-[#E9E1F3]"><th scope="row" className="py-3 font-medium text-[#350775]">{name}</th><td className="py-3 text-right font-bold text-[#350775]">{net}</td></tr>)}</tbody></table>
      <p className="mt-4 rounded-xl bg-[#F0E8FB] p-4 text-sm leading-relaxed text-[#350775]">{data[exam].next}</p>
    </div>
  </figure>;
}
