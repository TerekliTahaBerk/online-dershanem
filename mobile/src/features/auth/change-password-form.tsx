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
export function ChangePasswordForm({ onDone, variant = 'panel' }: { onDone?: () => void; variant?: 'panel' | 'auth' }) {
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
      ? `Yeni parolan en az ${MIN_LENGTH} karakter olmalı.`
      : confirm.length > 0 && confirm !== next
        ? 'İki parola birbirini tutmuyor.'
        : next.length > 0 && next === current
          ? 'Yeni parolan eskisinden farklı olmalı.'
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
      setError(cause instanceof ApiError ? cause.message : 'Parolanı değiştiremedik. Bir daha dener misin?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {success ? <Banner tone="success">Parolan değişti! Güvenliğin için diğer cihazlardaki oturumlarını kapattık.</Banner> : null}
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <TextField
        variant={variant}
        label="Şu anki parolan"
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
        variant={variant}
        ref={nextRef}
        label="Yeni parolan"
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
        variant={variant}
        ref={confirmRef}
        label="Yeni parolan (tekrar)"
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
      <Button variant={variant === 'auth' ? 'auth' : 'primary'} label="Parolayı değiştir" onPress={submit} loading={busy} disabled={!canSubmit} testID="change-password-submit" />
    </>
  );
}
