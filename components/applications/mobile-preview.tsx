import Image from "next/image";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import styles from "./applications.module.css";

export function AppScreen({ product, priority = false }: { product: "od" | "yon" | "deneme"; priority?: boolean }) {
  const labels = { od: "onlinedershanem ders ve çalışma ekranı", yon: "Yön Koçluk günlük plan ekranı", deneme: "Deneme Ligi deneme ve sonuç ekranı" };
  return <div className={styles.device}>
    <div className={styles.deviceGlass}>
      <div className={styles.deviceStatus} aria-hidden="true"><span>9:41</span><span><Signal /><Wifi /><BatteryFull /></span></div>
      <div className={styles.deviceDisplay}><Image src={`/applications/${product}.webp`} alt={labels[product]} width={750} height={1334} sizes="(max-width: 767px) 240px, 300px" preload={priority} /></div>
      <span className={styles.deviceHome} aria-hidden="true" />
    </div>
    <Image className={styles.deviceFrame} src="/applications/iphone-16-pro-frame.webp" alt="" width={1406} height={2822} sizes="(max-width: 767px) 240px, 300px" preload={priority} aria-hidden="true" />
  </div>;
}

export function MobilePreview() {
  return <figure className={styles.preview}>
    <div className={styles.phoneTrio}><div className={styles.backPhone}><AppScreen product="yon" priority /></div><div className={styles.frontPhone}><AppScreen product="od" priority /></div><div className={styles.lastPhone}><AppScreen product="deneme" priority /></div></div>
    <figcaption>Gerçek uygulama ekranları · Örnek öğrenci verileri</figcaption>
  </figure>;
}
