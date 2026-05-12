import React from "react";
import { View, Alert } from "react-native";
import { Screen, Typography, Card, Button } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function StudentProfile() {
  const { user, logout } = useAuth();

  const onLogout = () =>
    Alert.alert("Çıkış", "Oturumu kapatmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış", style: "destructive", onPress: () => logout() },
    ]);

  return (
    <Screen scroll>
      <View className="pt-4 pb-3">
        <Typography variant="displayMd">Profil</Typography>
      </View>

      <Card className="gap-1">
        <Typography variant="h3">{user?.name ?? "—"}</Typography>
        <Typography variant="caption" muted>
          {user?.email}
        </Typography>
        <Typography variant="caption" muted>
          Rol: {user?.role}
        </Typography>
      </Card>

      <View className="mt-6">
        <Button title="Çıkış yap" variant="danger" onPress={onLogout} />
      </View>
    </Screen>
  );
}
