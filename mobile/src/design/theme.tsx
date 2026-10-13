import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo } from 'react-native';

import { NEUTRAL_THEME, type ProductTheme } from './products';

type DesignContextValue = { product: ProductTheme; reduceMotion: boolean };

const DesignContext = createContext<DesignContextValue>({ product: NEUTRAL_THEME, reduceMotion: true });

/**
 * Ürün vurgusu + işletim sistemi erişilebilirlik tercihleri. Hareket azaltma
 * açıkken iskelet animasyonu ve sheet geçişi kapanır.
 */
export function DesignProvider({ product, children }: PropsWithChildren<{ product: ProductTheme }>) {
  // Start quietly until the system preference is known; never flash motion
  // for someone who has explicitly disabled it.
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduceMotion(value)).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return <DesignContext.Provider value={{ product, reduceMotion }}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignContextValue {
  return useContext(DesignContext);
}
