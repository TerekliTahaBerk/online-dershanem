import { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';

import { Banner, Button, Text, TextField } from '@/design/primitives';
import { color, radius, space } from '@/design/tokens';
import { beginTotpEnrollment, confirmTotpEnrollment } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * C09 · Doğrulayıcı uygulama (TOTP) kaydı — web `AdminMfaForm` ile aynı uçlar.
 *
 * 1. `PUT` yeni bekleyen gizli anahtar (10 dk) → anahtar ve `otpauth://`
 *    bağlantısı (aynı cihazdaki doğrulayıcıyı açar).
 * 2. `POST` 6 haneli kod → sunucu doğrular, oturumu MFA doğrulanmış işaretler
 *    ve kurtarma kodlarını BİR KEZ döndürür.
 * 3. Kurtarma kodları kaydedildi onayı alınmadan akış kapanmaz.
 * Gizli anahtar ve kodlar yalnız bileşen durumunda tutulur; loglanmaz,
 * önbelleğe / güvenli depoya yazılmaz.
 */
type Step = { kind: 'intro' } | { kind: 'secret'; secret: string; otpauthUri: string } | { kind: 'codes'; codes: string[] };

export function TotpEnrollment({ onDone, replacing = false, variant = 'panel' }: { onDone: () => void | Promise<void>; replacing?: boolean; variant?: 'panel' | 'auth' }) {
  const { api } = useSession();
  const [step, setStep] = useState<Step>({ kind: 'intro' });
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [canOpen, setCanOpen] = useState(true);

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      const started = await beginTotpEnrollment(api);
      setStep({ kind: 'secret', ...started });
      setCode('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Kurulumu şu an başlatamadık. Lütfen tekrar dener misin?');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await confirmTotpEnrollment(api, code.trim());
      setStep({ kind: 'codes', codes: result.recoveryCodes });
    } catch (cause) {
      // 410: bekleyen anahtarın süresi doldu (veya önceki deneme tamamlandı) → yeniden başlatılır.
      if (cause instanceof ApiError && cause.status === 410) {
        setStep({ kind: 'intro' });
        setError('Kurulum süresi dolmuş ya da kurulum zaten tamamlanmış olabilir. Durumu kontrol edebilir ya da kurulumu yeniden başlatabilirsin.');
      } else {
        setError(cause instanceof ApiError ? cause.message : 'Kodu doğrulayamadık. Lütfen kontrol edip tekrar dener misin?');
      }
    } finally {
      setBusy(false);
    }
  }

  async function openAuthenticator(uri: string) {
    try {
      await Linking.openURL(uri);
    } catch {
      setCanOpen(false);
    }
  }

  if (step.kind === 'intro') {
    return (
      <View style={styles.block}>
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <Text tone="secondary">
          {replacing
            ? 'Yeni bir doğrulayıcı anahtarı oluşturulur. Kurulum tamamlanınca eski doğrulayıcı kodları ve kurtarma kodları geçersiz olur.'
            : 'Google Authenticator, Microsoft Authenticator veya 1Password gibi bir doğrulayıcı uygulama kullan.'}
        </Text>
        <Button variant={variant === 'auth' ? 'auth' : 'primary'} label={replacing ? 'Yeni doğrulayıcı kur' : 'Doğrulayıcı uygulamayı kur'} loading={busy} disabled={busy} onPress={() => void begin()} testID="totp-begin" />
      </View>
    );
  }

  if (step.kind === 'secret') {
    const valid = /^\d{6}$/.test(code.trim());
    return (
      <View style={styles.block}>
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <Text tone="secondary">Anahtarı doğrulayıcı uygulamana ekle, ardından gösterdiği 6 haneli kodu gir. Anahtar 10 dakika geçerlidir.</Text>
        <View style={styles.secret}>
          <Text variant="label" tone="muted">Kurulum anahtarı</Text>
          <Text selectable variant="bodyStrong" testID="totp-secret">{step.secret.replace(/(.{4})/g, '$1 ').trim()}</Text>
        </View>
        {canOpen ? <Button label="Doğrulayıcı uygulamada aç" variant="secondary" onPress={() => void openAuthenticator(step.otpauthUri)} testID="totp-open" /> : <Text tone="muted" variant="meta">Doğrulayıcı uygulamayı açamadık; anahtarı elle ekleyebilirsin.</Text>}
        <TextField
          variant={variant}
          label="Doğrulama kodu"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          testID="totp-code"
        />
        <Button variant={variant === 'auth' ? 'auth' : 'primary'} label="Kurulumu tamamla" loading={busy} disabled={!valid || busy} onPress={() => void confirm()} testID="totp-confirm" />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Banner tone="warning" title="Kurtarma kodlarını şimdi kaydet">Bu kodlar yalnızca bir kez gösterilir. Telefonunu kaybedersen hesabına bu kodlarla girebilirsin; her kod bir kez kullanılır. Güvenli bir yere not etmeyi unutma 🔐</Banner>
      <View style={styles.secret} testID="totp-recovery-codes">
        {step.codes.map((item) => <Text key={item} selectable variant="bodyStrong">{item}</Text>)}
      </View>
      <Button label="Kodları paylaş / kaydet" variant="secondary" onPress={() => void Share.share({ message: `Online Dershanem kurtarma kodları:\n${step.codes.join('\n')}` })} testID="totp-share" />
      <Button variant={variant === 'auth' ? 'auth' : 'primary'} label="Kodları kaydettim, devam et" onPress={() => void onDone()} testID="totp-done" />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space[3] },
  secret: { gap: space[1], padding: space[3], borderRadius: radius.card, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border },
});
