"use client";
import { useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, ArrowRight } from "lucide-react";
import { AppScreen } from "./mobile-preview";
import styles from "./applications.module.css";
const products = [
  { id: "od", name: "onlinedershanem", logo: "/design/od-logo.png", title: "Dersin belli.\nSıradaki adımın da.", body: "Canlı dersin, teslim edilecek ödevin, tekrar etmen gereken konu… Gününü tek bir akışta gör, çalışmaya nereden başlayacağını bil.", points: ["Yaklaşan derslerini ve programını takip et.", "Ödevlerini ve tekrarlarını bir arada gör.", "Haftalık çalışmalarına ve gelişimine göz at."], href: "/urunler/online-dershanem", color: "green" },
  { id: "yon", name: "Yön Koçluk", logo: "/yon/logo.png", title: "Bir planın var.\nYanında koçun var.", body: "Hedefine giden yolu günlük adımlara böl. Koçunun hazırladığı planı takip et; görevlerin, görüşmelerin ve hedeflerin elinin altında olsun.", points: ["Günlük görevlerini ve haftalık planını gör.", "Koç görüşmelerini ve notlarını takip et.", "Tamamladığın adımlarla ilerlemeni izle."], href: "/urunler/online-kocum", color: "blue" },
  { id: "deneme", name: "Deneme Ligi", logo: "/deneme-ligi/logo.png", title: "Her denemede\nkendini daha iyi tanı.", body: "Sıradaki denemeni kaçırma. Sonuçlarına dön, netlerinin değişimini izle ve çalışman gereken konuları daha net gör.", points: ["Yaklaşan denemeleri ve sınav takvimini gör.", "Açıklanan sonuçlarını ve netlerini incele.", "Konu analizleriyle sonraki çalışmana yön ver."], href: "/urunler/online-deneme-kulubum", color: "purple" },
] as const;
export function ProductExplorer() {
  const [selected, setSelected] = useState(0);
  const panelId = useId();
  const item = products[selected];
  return (
    <div className={styles.explorer} data-theme={item.color}>
      <div className={styles.productSelectors} role="group" aria-label="Mobil çalışma alanları">
        {products.map((product, index) => (
          <button key={product.id} type="button" aria-pressed={selected === index}
            aria-controls={panelId} onClick={() => setSelected(index)}>
            <Image src={product.logo} alt="" width={24} height={24} />
            {product.name}
          </button>
        ))}
      </div>
      <div className={styles.explorerMedia}>
        <AppScreen product={item.id} />
        <span className={styles.screenCaption}>{item.name} · Gerçek uygulama ekranı</span>
      </div>
      <div id={panelId} className={styles.explorerContent}>
        <div aria-live="polite" aria-atomic="true">
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <ul>{item.points.map(point => <li key={point}><Check size={18} aria-hidden="true" />{point}</li>)}</ul>
          <Link href={item.href} className={styles.secondary}>Ürünü yakından tanı <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <p className={styles.accessNote}>Çalışma alanları, hesabındaki ürün erişimlerine göre açılır.</p>
      </div>
    </div>
  );
}
const questions = {
 YKS: { subject: "TYT Matematik · Sayılar", question: "Bir sayının %20’si 12 ise bu sayı kaçtır?", answers: ["48", "60", "72", "80"], correct: 1, explanation: "%20, sayının beşte biridir. 12 × 5 = 60. Küçük bir adım, bir konu daha net!" },
 LGS: { subject: "LGS Matematik · Üslü ifadeler", question: "2³ × 2² işleminin sonucu kaçtır?", answers: ["10", "16", "32", "64"], correct: 2, explanation: "Tabanlar aynıysa üsler toplanır: 2³ × 2² = 2⁵ = 32. Harika, şimdi bir adım ileridesin!" },
};
export function BilginExercise() {
 const [exam,setExam]=useState<keyof typeof questions>("YKS"); const [answer,setAnswer]=useState<number|null>(null); const [checked,setChecked]=useState(false); const q=questions[exam]; const correct=answer===q.correct;
 return <div className={styles.quiz}><div className={styles.quizTop}><div role="group" aria-label="Örnek sınav seçimi">{(["YKS","LGS"] as const).map(e=><button type="button" aria-pressed={exam===e} key={e} onClick={()=>{setExam(e);setAnswer(null);setChecked(false);}}>{e}</button>)}</div><span>Örnek egzersiz</span></div>
 <fieldset><legend><span>{q.subject}</span>{q.question}</legend><div className={styles.answers}>{q.answers.map((a,i)=><label key={`${exam}-${a}`} data-result={checked && i===q.correct ? "correct" : checked && answer===i ? "incorrect" : undefined}><input type="radio" name="bilgin-answer" value={i} checked={answer===i} disabled={checked} onChange={()=>setAnswer(i)}/><span>{"ABCD"[i]}</span>{a}</label>)}</div></fieldset>
 <div className={styles.feedback} role="status" aria-live="polite" aria-atomic="true">{checked && <p><strong>{correct?"Tam isabet!":"Birlikte bakalım."}</strong> Doğru cevap: {q.answers[q.correct]}. {q.explanation}</p>}</div>
 <button className={styles.quizSubmit} type="button" disabled={answer===null} onClick={()=>checked ? (setAnswer(null),setChecked(false)) : setChecked(true)}>{checked?"Yeniden dene":"Cevabını kontrol et"}<ArrowRight size={18} aria-hidden="true"/></button><p className={styles.quizNote}>Bu, Bilgin deneyimine küçük bir ön bakış. İlerlemen kaydedilmez.</p>
 </div>;
}
