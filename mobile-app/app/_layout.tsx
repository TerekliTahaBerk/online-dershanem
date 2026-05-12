import "../global.css";
import React, { useEffect } from "react";
import { Slot, SplashScreen, useRouter, useSegments } from "expo-router";
import { AppProviders } from "@/providers/AppProviders";
import { useAuth } from "@/providers/AuthProvider";
import { addNotificationResponseListener } from "@/lib/notifications";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types/user";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const ROLE_GROUP: Record<UserRole, string> = {
  STUDENT: "(student)",
  TEACHER: "(teacher)",
  PARENT: "(parent)",
  ADMIN: "(admin)",
};

/**
 * AuthGate:
 *  - status=loading → splash görünür kalır.
 *  - unauthenticated + auth grubu dışındaysa → /login.
 *  - authenticated + role grubu dışındaysa → ilgili role ana ekranına.
 *  - Push tıklamasında href varsa router push.
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, role } = useAuth();
  const router = useRouter();
  const segments = useSegments() as string[];

  useEffect(() => {
    if (status === "loading") return;
    SplashScreen.hideAsync().catch(() => undefined);

    const inAuthGroup = segments[0] === "(auth)";

    if (status === "unauthenticated") {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    if (status === "authenticated" && role) {
      const target = ROLE_GROUP[role];
      const currentGroup = segments[0];
      if (currentGroup !== target) {
        // role-based redirect (also covers the just-logged-in flow).
        router.replace(`/${target}` as never);
      }
    }
  }, [status, role, segments, router]);

  // Deep-link from push notifications.
  useEffect(() => {
    const sub = addNotificationResponseListener((href) => {
      if (href && href.startsWith("/")) router.push(href as never);
    });
    return () => sub.remove();
  }, [router]);

  return <>{children}</>;
}

export default function RootLayout() {
  // Hidrasyon trigger — useAuthStore mount edilsin.
  useAuthStore.getState();

  return (
    <AppProviders>
      <AuthGate>
        <Slot />
      </AuthGate>
    </AppProviders>
  );
}
