import type { MobileProductCode } from '@contracts/bootstrap';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { space } from './tokens';

const LOGOS = {
  OD: require('../../assets/brand/od.png'),
  OK: require('../../assets/brand/yon.png'),
  ODK: require('../../assets/brand/deneme-ligi.png'),
};

/** The same approved assets as web AuthBrandLogos and WorkspaceSwitcher. */
export function ProductLogo({ product = 'OD', size = 32 }: { product?: MobileProductCode; size?: number }) {
  return <Image source={LOGOS[product]} contentFit="contain" style={{ width: size, height: size, borderRadius: size * 0.27 }} accessibilityIgnoresInvertColors alt="" />;
}

export function BrandLogos() {
  return <View style={styles.logos} accessibilityLabel="onlinedershanem., Yön Koçluk, Deneme Ligi">
    <ProductLogo product="OD" size={48} />
    <ProductLogo product="OK" size={48} />
    <ProductLogo product="ODK" size={48} />
  </View>;
}

const styles = StyleSheet.create({ logos: { flexDirection: 'row', justifyContent: 'center', gap: space[3] } });
