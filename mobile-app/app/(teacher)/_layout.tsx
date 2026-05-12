import React from "react";
import { Tabs } from "expo-router";
import { palette } from "@/constants/colors";

export default function TeacherLayout() {
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
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Panel" }} />
    </Tabs>
  );
}
