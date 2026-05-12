import { apiClient } from "./client";
import { endpoints } from "./endpoints";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, AuthUser } from "@/types/user";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient
      .post<ApiResponse<LoginResult>>(endpoints.login, payload, { auth: false })
      .then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<ApiResponse<AuthTokens>>(endpoints.refresh, { refreshToken }, { auth: false })
      .then((r) => r.data),

  logout: () => apiClient.post<void>(endpoints.logout),

  me: () => apiClient.get<ApiResponse<AuthUser>>(endpoints.me).then((r) => r.data),

  sendCode: (email: string, type: "REGISTER" | "PASSWORD_RESET") =>
    apiClient.post<{ ok: true }>(endpoints.sendCode, { email, type }, { auth: false }),

  completeRegistration: (payload: {
    email: string;
    code: string;
    fullName: string;
    phone: string;
    password: string;
  }) =>
    apiClient.post<{ ok: true }>(endpoints.completeRegistration, payload, { auth: false }),

  resetPassword: (payload: { email: string; code: string; newPassword: string }) =>
    apiClient.post<{ ok: true }>(endpoints.resetPassword, payload, { auth: false }),
};
