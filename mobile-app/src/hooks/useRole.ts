/**
 * Auth tipini hızlıca okumak için kısa hook — `useAuth().role` ile aynı,
 * sadece daha tip-güvenli ve refactor dostu.
 */
import { useAuth } from "@/providers/AuthProvider";

export function useRole() {
  const { role, status } = useAuth();
  return {
    role,
    isLoading: status === "loading",
    isStudent: role === "STUDENT",
    isTeacher: role === "TEACHER",
    isParent: role === "PARENT",
    isAdmin: role === "ADMIN",
  };
}
