import React from "react";
import { View } from "react-native";
import { Screen, Typography, Button } from "@/components/ui";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const router = useRouter();
  return (
    <Screen edges={["top", "bottom"]}>
      <View className="flex-1 justify-center">
        <Typography variant="displayMd">Kayıt ol</Typography>
        <Typography variant="bodySm" muted className="mt-2">
          E-posta + telefon doğrulama akışı yakında. Şimdilik web üzerinden kayıt olabilirsin.
        </Typography>
        <View className="mt-6">
          <Button title="Geri" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    </Screen>
  );
}
