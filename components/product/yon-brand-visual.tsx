import { getImageProps } from "next/image";
import { yonBrand } from "@/lib/yon-brand";
import styles from "./yon-brand.module.css";

export function YonHeroVisual() {
  const common = { alt: yonBrand.imageAlt, width: 1254, height: 1254, loading: "eager" as const };
  const desktop = getImageProps({ ...common, src: yonBrand.logo, sizes: "(min-width: 1440px) 440px, (min-width: 1024px) 400px, 360px" });
  const mobile = getImageProps({ ...common, src: yonBrand.mascot, sizes: "(min-width: 390px) 176px, (min-width: 375px) 168px, 144px" });
  return (
    <picture className={styles.heroPicture}>
      <source media="(min-width: 768px)" srcSet={desktop.props.srcSet} sizes={desktop.props.sizes} />
      {/* Next's documented art-direction API supplies the optimized img props. */}
      <img {...mobile.props} alt={yonBrand.imageAlt} />
    </picture>
  );
}
