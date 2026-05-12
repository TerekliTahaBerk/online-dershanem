import React from "react";
import { View, ActivityIndicator } from "react-native";

/**
 * Splash sonrası ilk frame — AuthGate ya /(auth)/login'e ya da role grubuna
 * yönlendirir. Bu ekran sadece geçici yükleme spinner'ı gösterir.
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color="#7C5CFF" size="large" />
    </View>
  );
}
