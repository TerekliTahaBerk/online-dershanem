import type { MobileProductCode } from '@contracts/bootstrap';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner, BottomSheet, Row, StatusBadge, Text } from '@/design/primitives';
import { productTheme, PRODUCT_FALLBACK_LABEL } from '@/design/products';
import { color, radius, space, touchTarget } from '@/design/tokens';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

import { PRODUCT_STATE_PRESENTATION } from './labels';

/**
 * Çalışma alanı değiştirici. Seçim YETKİ VERMEZ: sunucuya
 * (`POST /api/panel/active-product`) yazılır, ardından bootstrap yeniden
 * çekilir ve menü sunucunun döndürdüğü kapsamla kurulur. Yalnız `ACTIVE`
 * ürünler seçilebilir; diğerleri açıklamalı ve devre dışıdır.
 */
export function WorkspaceSwitcher() {
  const { bootstrap, selectWorkspace } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<MobileProductCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workspace = bootstrap?.workspace;
  if (!workspace) return null;

  const current = workspace.products.find((product) => product.code === workspace.activeProduct) ?? null;
  const theme = productTheme(current?.code);
  const selectable = workspace.products.filter((product) => product.state === 'ACTIVE').length;

  async function choose(code: MobileProductCode) {
    setPending(code);
    setError(null);
    try {
      await selectWorkspace(code);
      setOpen(false);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Çalışma alanı değiştirilemedi.');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Çalışma alanı: ${current?.label ?? 'seçilmedi'}`}
        accessibilityHint={selectable > 1 ? 'Çalışma alanlarını listeler' : undefined}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { backgroundColor: color.pressed }]}>
        <View style={[styles.dot, { backgroundColor: theme.accentMarker }]} />
        <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
          {current?.label ?? 'Çalışma alanı seç'}
        </Text>
        <Text tone="muted" variant="meta">
          Değiştir
        </Text>
      </Pressable>
      <BottomSheet visible={open} title="Çalışma alanı" onClose={() => setOpen(false)}>
        {error ? <Banner tone="critical">{error}</Banner> : null}
        {workspace.products.map((product) => {
          const presentation = PRODUCT_STATE_PRESENTATION[product.state];
          return (
            <Row
              key={product.code}
              testID={`workspace-${product.code}`}
              title={product.label || PRODUCT_FALLBACK_LABEL[product.code]}
              subtitle={product.state === 'ACTIVE' ? null : presentation.description}
              selected={product.code === workspace.activeProduct}
              disabled={product.state !== 'ACTIVE' || pending !== null}
              leading={<View style={[styles.dot, { backgroundColor: productTheme(product.code).accentMarker }]} />}
              trailing={pending === product.code ? <Text tone="muted">…</Text> : <StatusBadge label={presentation.label} tone={presentation.tone} />}
              onPress={product.state === 'ACTIVE' && product.code !== workspace.activeProduct ? () => void choose(product.code) : undefined}
            />
          );
        })}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  trigger: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.sidebar,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
