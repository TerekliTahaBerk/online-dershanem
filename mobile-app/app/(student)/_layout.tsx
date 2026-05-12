import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { palette } from "@/constants/colors";
import { registerForPushAsync } from "@/lib/notifications";

export default function StudentLayout() {
  useEffect(() => {
    registerForPushAsync().catch(() => undefined);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.brand,
        tabBarInactiveTintColor: palette.inkDim,
        tabBarStyle: {
          backgroundColor: palette.bgSubtle,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Bugün" }} />
      <Tabs.Screen name="lessons" options={{ title: "Dersler" }} />
      <Tabs.Screen name="tasks" options={{ title: "Görevler" }} />
      <Tabs.Screen name="exams" options={{ title: "Denemeler" }} />
      <Tabs.Screen name="profile" options={{ title: "Profil" }} />
    </Tabs>
  );
}
