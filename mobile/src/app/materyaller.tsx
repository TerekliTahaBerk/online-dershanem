import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ExternalLink, FileText, Link2, Video } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL, ApiError, apiFetch } from '@/lib/api';
import { ListEmpty, PanelHeading } from '@/components/panel-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/auth-context';

type Kind = 'LINK' | 'PDF' | 'VIDEO';
type Material = {
  id: string;
  kind: Kind;
  title: string;
  description: string | null;
  groupName: string;
  subject: string;
  url: string | null;
  hasFile: boolean;
  fileName: string | null;
  mimeType: string | null;
  captionsAvailable: boolean;
  transcript: string | null;
  preferred: boolean;
};
type MaterialsData = { profile: { id: string } | null; lowDataMode: boolean; preferenceActive: boolean; materials: Material[] };

const KIND_ICON: Record<Kind, typeof Link2> = { LINK: Link2, PDF: FileText, VIDEO: Video };

function MaterialCard({ material, token }: { material: Material; token: string }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const Icon = KIND_ICON[material.kind];

  async function handleOpen() {
    setOpening(true);
    setOpenError(null);
    try {
      if (material.url) {
        await Linking.openURL(material.url);
        return;
      }
      if (!material.hasFile) return;
      // Dosya sunucusu Bearer ile korunuyor — `Linking.openURL` başlık
      // taşımaz, bu yüzden önce kimlikli indirme, sonra paylaşım sayfası.
      const destination = new File(Paths.cache, material.fileName || `${material.id}${material.kind === 'PDF' ? '.pdf' : ''}`);
      const downloaded = await File.downloadFileAsync(`${API_BASE_URL}/api/panel/materials/${material.id}/file`, destination, {
        headers: { Authorization: `Bearer ${token}` },
        idempotent: true,
      });
      if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, material.mimeType ? { mimeType: material.mimeType } : undefined);
      }
    } catch {
      setOpenError('Kaynak açılamadı. Bağlantınızı kontrol edin.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBadge}>
          <Icon size={19} color={BrandColors.brandHover} />
        </View>
        {material.preferred ? (
          <View style={styles.preferredBadge}>
            <ThemedText type="small" style={styles.preferredBadgeText}>
              Tercihinle uyumlu
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
        {material.groupName} · {material.subject}
      </ThemedText>
      <ThemedText style={styles.title}>{material.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {material.description || 'Öğretmeninin paylaştığı çalışma kaynağı.'}
      </ThemedText>

      {material.captionsAvailable || material.transcript ? (
        <View style={styles.tagRow}>
          {material.captionsAvailable ? (
            <View style={styles.tagCaptions}>
              <ThemedText type="small" style={styles.tagCaptionsText}>
                Altyazı var
              </ThemedText>
            </View>
          ) : null}
          {material.transcript ? (
            <View style={styles.tagTranscript}>
              <ThemedText type="small" style={styles.tagTranscriptText}>
                Metin dökümü var
              </ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}

      {material.transcript ? (
        <View style={styles.transcriptBox}>
          <Pressable accessibilityRole="button" onPress={() => setTranscriptOpen((v) => !v)}>
            <ThemedText type="smallBold">{transcriptOpen ? 'Metin dökümünü gizle' : 'Metin dökümünü oku'}</ThemedText>
          </Pressable>
          {transcriptOpen ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.transcriptText}>
              {material.transcript}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {openError ? (
        <ThemedText type="small" style={styles.errorBanner}>
          {openError}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={opening}
        onPress={handleOpen}
        style={({ pressed }) => [styles.openButton, opening && styles.openButtonDisabled, pressed && styles.openButtonPressed]}>
        {opening ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <ThemedText type="smallBold" style={styles.openButtonLabel}>
              Kaynağı aç
            </ThemedText>
            <ExternalLink size={14} color="#ffffff" />
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function MateryallerScreen() {
  const { token, signOut } = useSession();
  const [data, setData] = useState<MaterialsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<MaterialsData>('/api/panel/materials', { token });
        setData(result);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await signOut();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Materyaller yüklenemedi. Bağlantınızı kontrol edin.');
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

  if (loading) {
    return (
      <ThemedView style={styles.centerFlex}>
        <ActivityIndicator color={BrandColors.brandStrong} size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={BrandColors.brandStrong} colors={[BrandColors.brandStrong]} />
          }>
          <PanelHeading title="Kaynaklarım" description="İhtiyacın olan her şey burada." />

          {error ? (
            <ThemedText type="small" style={styles.errorBanner}>
              {error}
            </ThemedText>
          ) : null}

          {data?.lowDataMode ? (
            <ThemedText type="small" style={styles.lowDataNote}>
              Düşük veri açık: metin dökümleri ve bağlantılar önce; büyük dosyalar yalnız siz açarsanız yüklenir.
            </ThemedText>
          ) : data?.preferenceActive ? (
            <ThemedText type="small" themeColor="textSecondary">
              Altyazı ve metin tercihinle eşleşen kaynaklar önce gösterilir.
            </ThemedText>
          ) : null}

          {!data?.profile ? (
            <ListEmpty title="Profilin hazırlanıyor." body="Öğrenci profilin tamamlandığında kaynakların burada görünür." />
          ) : data.materials.length === 0 ? (
            <ListEmpty title="Henüz paylaşılmış materyal yok." body="Öğretmenin yeni bir kaynak eklediğinde burada görünecek." />
          ) : (
            <View style={styles.list}>
              {data.materials.map((material) => (
                <MaterialCard key={material.id} material={material} token={token!} />
              ))}
            </View>
          )}
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
  lowDataNote: { color: BrandColors.brandHover, fontWeight: '700' },
  list: { gap: Spacing.three },
  card: { borderRadius: 14, borderWidth: 1, borderColor: BrandColors.line, backgroundColor: '#ffffff', padding: Spacing.three, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconBadge: { width: 44, height: 44, borderRadius: 16, backgroundColor: BrandColors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  preferredBadge: { backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  preferredBadgeText: { color: '#047857' },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  title: { fontSize: 16, fontWeight: '800' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tagCaptions: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  tagCaptionsText: { color: '#075985' },
  tagTranscript: { backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  tagTranscriptText: { color: '#047857' },
  transcriptBox: { borderRadius: 12, borderWidth: 1, borderColor: BrandColors.line, padding: Spacing.two, marginTop: 4 },
  transcriptText: { marginTop: 8, lineHeight: 20 },
  openButton: {
    flexDirection: 'row',
    gap: 6,
    height: 44,
    borderRadius: 10,
    backgroundColor: BrandColors.brandStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  openButtonPressed: { backgroundColor: BrandColors.brandHover },
  openButtonDisabled: { opacity: 0.6 },
  openButtonLabel: { color: '#ffffff' },
});
