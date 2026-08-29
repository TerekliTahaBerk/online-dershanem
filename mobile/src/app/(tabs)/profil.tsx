import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, CardTitle, PanelHeading } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError, apiFetch } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

const DATE = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

type ProfileData = {
  fullName: string | null;
  email: string;
  targetGoal: string | null;
  classLevel: string | null;
  parents: string[];
  activeProducts: { label: string; expiresAt: string | null }[];
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.fieldValue}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function ProfilScreen() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<ProfileData>('/api/panel/student/profile', { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Profil yüklenemedi. Bağlantınızı kontrol edin.');
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    load();
  }, [load]);

  function confirmSignOut() {
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Çıkış yap', 'Bu cihazdaki oturumunuz kapatılacak.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: handleSignOut },
    ]);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.centerFlex}>
        <ActivityIndicator color={BrandColors.brandStrong} size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BrandColors.brandStrong} colors={[BrandColors.brandStrong]} />
          }>
          <PanelHeading title="Profil ve hesap" />

          {error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : null}

          {data ? (
            <>
              <Card>
                <CardTitle>Bilgilerin</CardTitle>
                <View style={styles.fieldGrid}>
                  <Field label="Ad soyad" value={data.fullName || '—'} />
                  <Field label="E-posta" value={data.email} />
                  <Field label="Hedef sınav" value={data.targetGoal || 'Henüz belirlenmedi'} />
                  <Field label="Sınıf" value={data.classLevel || 'Henüz belirlenmedi'} />
                  <Field label="Bağlı veli" value={data.parents.length ? data.parents.join(', ') : 'Bağlı veli yok'} />
                </View>
              </Card>

              <Card>
                <CardTitle>Paketin</CardTitle>
                {data.activeProducts.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Şu anda aktif bir ürün paketin görünmüyor. Paket bilgin güncellenmediyse eğitim koordinatörünle görüşebilirsin.
                  </ThemedText>
                ) : (
                  <View style={styles.productList}>
                    {data.activeProducts.map((p) => (
                      <View key={p.label} style={styles.productRow}>
                        <ThemedText type="small">{p.label}</ThemedText>
                        <ThemedText type="small" style={styles.productActive}>
                          Aktif{p.expiresAt ? ` · dönem sonu ${DATE.format(new Date(p.expiresAt))}` : ''}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </>
          ) : null}

          <Card>
            <CardTitle>Hesap güvenliği</CardTitle>
            <Pressable
              accessibilityRole="button"
              onPress={confirmSignOut}
              disabled={signingOut}
              style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}>
              {signingOut ? (
                <ActivityIndicator color="#B3261E" />
              ) : (
                <>
                  <SymbolView name="rectangle.portrait.and.arrow.right" size={16} tintColor="#B3261E" fallback={null} />
                  <ThemedText type="smallBold" style={styles.signOutLabel}>
                    Çıkış Yap
                  </ThemedText>
                </>
              )}
            </Pressable>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  errorBanner: { color: '#B3261E' },
  fieldGrid: { gap: Spacing.two },
  field: { gap: 2 },
  fieldValue: { fontWeight: '500' },
  productList: { gap: Spacing.two },
  productRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.one },
  productActive: { color: BrandColors.brandHover },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0D8D4',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
  },
  signOutButtonPressed: { backgroundColor: '#FBEEEC' },
  signOutLabel: { color: '#B3261E' },
});
