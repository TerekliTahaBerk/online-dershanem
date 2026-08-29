import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { BrandColors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { token, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" />
        {/* Web'in kenar çubuğundaki her öğe ayrı bir sekme OLMUYOR (5 sekme
            sınırı) — Denemeler/Gelişim, Ana Sayfa'dan itilen (pushed) ekranlar,
            web'de de bunlar Ana Sayfa'dan link ile açılıyor (§"Sonucu ve
            analizi aç →"). */}
        <Stack.Screen
          name="denemeler"
          options={{ headerShown: true, title: 'Denemeler', headerTintColor: BrandColors.brandStrong }}
        />
        <Stack.Screen
          name="gelisim"
          options={{ headerShown: true, title: 'Gelişim', headerTintColor: BrandColors.brandStrong }}
        />
        <Stack.Screen
          name="hedefler"
          options={{ headerShown: true, title: 'Hedefler', headerTintColor: BrandColors.brandStrong }}
        />
        <Stack.Screen
          name="materyaller"
          options={{ headerShown: true, title: 'Materyaller', headerTintColor: BrandColors.brandStrong }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Web paneli karanlık mod desteklemiyor (`--dc-*` yalnız `:root`'ta
  // tanımlı) — mobil de kasıtlı olarak TEK, ışık temasında (bkz.
  // `constants/theme.ts` ve `app.json`'daki `userInterfaceStyle: "light"`).
  // Sistem koyu modundayken gezinme kromu koyu, içerik açık kalıp
  // uyumsuz görünmesin diye burada da sabit `DefaultTheme` kullanılıyor.
  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </ThemeProvider>
  );
}
