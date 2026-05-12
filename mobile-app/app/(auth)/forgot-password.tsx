import React from "react";
import { View } from "react-native";
import { Screen, Typography, Button } from "@/components/ui";
import { useRouter } from "expo-router";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  return (
    <Screen edges={["top", "bottom"]}>
      <View className="flex-1 justify-center">
        <Typography variant="displayMd">Şifremi unuttum</Typography>
        <Typography variant="bodySm" muted className="mt-2">
          Kod gönderme akışı backend mobil uçları hazır olduğunda aktif edilecek.
        </Typography>
        <View className="mt-6">
          <Button title="Geri" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
