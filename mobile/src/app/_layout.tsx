import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, useFonts } from '@expo-google-fonts/manrope';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NEUTRAL_THEME, productTheme } from '@/design/products';
import { DesignProvider } from '@/design/theme';
import { color } from '@/design/tokens';
import { SessionProvider, useSession } from '@/lib/auth/session-provider';

void SplashScreen.preventAutoHideAsync();

const NAV_THEME = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: color.canvas, card: color.canvas, border: color.border, text: color.text, primary: color.focus } };

/**
 * Kök navigatör: hangi rota grubunun açık olduğu YALNIZ durum makinesinden
 * (`deriveAppState`, kaynağı sunucu bootstrap'ı) gelir. Her grup
 * `Stack.Protected` ile korunur; korumalı olmayan bir rotaya derin bağlantı
 * gelirse Expo Router kullanıcıyı açık olan ilk rotaya döndürür.
 */
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { state } = useSession();
  const status = state.status;
  const booting = status === 'BOOTING' || !fontsReady;

  useEffect(() => {
    if (!booting) void SplashScreen.hideAsync();
  }, [booting]);

  const theme = status === 'WORKSPACE_READY' ? productTheme(state.workspace) : NEUTRAL_THEME;
  if (booting) return null;

  return (
    <DesignProvider product={theme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.canvas } }}>
        <Stack.Protected guard={status === 'UNAUTHENTICATED' || status === 'AUTHENTICATING'}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'UPGRADE_REQUIRED'}>
          <Stack.Screen name="upgrade" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'BOOTSTRAP_ERROR'}>
          <Stack.Screen name="bootstrap-error" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'PASSWORD_CHANGE_REQUIRED'}>
          <Stack.Screen name="change-password" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'MFA_REQUIRED'}>
          <Stack.Screen name="mfa" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'WORKSPACE_SELECTION'}>
          <Stack.Screen name="workspace-select" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'WORKSPACE_READY'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </DesignProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold });
  // Font yüklenemezse sistem fontuyla devam edilir; uygulama açılışı bloklanmaz.
  const fontsReady = fontsLoaded || Boolean(fontError);
  return (
    <ThemeProvider value={NAV_THEME}>
      <StatusBar style="dark" />
      <SessionProvider>
        <RootNavigator fontsReady={fontsReady} />
      </SessionProvider>
    </ThemeProvider>
  );
}
