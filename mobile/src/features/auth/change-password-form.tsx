import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';

import { Banner, Button, TextField } from '@/design/primitives';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/** Sunucu politikasıyla aynı alt sınır (`PASSWORD_MIN_LENGTH`); asıl karar sunucuda. */
const MIN_LENGTH = 10;

/**
 * Parola değiştirme — zorunlu kapıda ve Ayarlar'da aynı form. Başarıdan
 * sonra durum İSTEMCİDE değiştirilmez: bootstrap yeniden çekilir, kapı
 * ancak sunucu `mustChangePassword=false` derse açılır.
 */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { api, refreshBootstrap } = useSession();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const localError =
    next.length > 0 && next.length < MIN_LENGTH
      ? `Yeni parola en az ${MIN_LENGTH} karakter olmalı.`
      : confirm.length > 0 && confirm !== next
        ? 'Parolalar eşleşmiyor.'
        : next.length > 0 && next === current
          ? 'Yeni parola mevcut paroladan farklı olmalı.'
          : null;
  const canSubmit = current.length > 0 && next.length >= MIN_LENGTH && confirm === next && next !== current && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await endpoints.changePassword(api, current, next);
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      await refreshBootstrap();
      onDone?.();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Parola değiştirilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {success ? <Banner tone="success">Parolan değiştirildi. Diğer cihazlardaki oturumlar kapatıldı.</Banner> : null}
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <TextField
        label="Mevcut parola"
        value={current}
        onChangeText={setCurrent}
        secureToggle
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        onSubmitEditing={() => nextRef.current?.focus()}
      />
      <TextField
        ref={nextRef}
        label="Yeni parola"
        value={next}
        onChangeText={setNext}
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        hint={`En az ${MIN_LENGTH} karakter.`}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
      />
      <TextField
        ref={confirmRef}
        label="Yeni parola (tekrar)"
        value={confirm}
        onChangeText={setConfirm}
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        error={localError}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label="Parolayı değiştir" onPress={submit} loading={busy} disabled={!canSubmit} testID="change-password-submit" />
    </>
  );
}
