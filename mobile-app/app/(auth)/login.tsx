import React, { useState } from "react";
import { View, Alert, KeyboardAvoidingView, Platform, TextInput } from "react-native";
import { Link } from "expo-router";
import { Screen, Button, Typography } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Eksik bilgi", "E-posta ve şifre zorunlu.");
      return;
    }
    try {
      setLoading(true);
      await login(email, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Giriş başarısız.";
      Alert.alert("Hata", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center"
      >
        <View className="mb-10">
          <Typography variant="displayMd">OnlineDershanem</Typography>
          <Typography variant="bodySm" muted className="mt-2">
            Eğitim ve takip merkezine hoş geldin.
          </Typography>
        </View>

        <View className="gap-3">
          <View>
            <Typography variant="label" className="mb-2">
              E-posta
            </Typography>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor="#6B7088"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              className="h-12 px-4 rounded-2xl bg-bg-card border border-bg-border text-ink"
            />
          </View>
          <View>
            <Typography variant="label" className="mb-2">
              Şifre
            </Typography>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6B7088"
              secureTextEntry
              autoComplete="password"
              className="h-12 px-4 rounded-2xl bg-bg-card border border-bg-border text-ink"
            />
          </View>

          <Button title="Giriş yap" onPress={onSubmit} loading={loading} className="mt-2" />

          <View className="flex-row items-center justify-between mt-2">
            <Link href="/(auth)/forgot-password">
              <Typography variant="bodySm" className="text-brand-300">
                Şifremi unuttum
              </Typography>
            </Link>
            <Link href="/(auth)/register">
              <Typography variant="bodySm" className="text-brand-300">
                Kayıt ol
              </Typography>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
