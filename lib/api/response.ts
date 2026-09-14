import { NextResponse } from "next/server";

export const API_ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES] | (string & {});

export type ApiErrorBody = {
  success: false;
  error: { code: ApiErrorCode; message: string; details?: unknown };
};

export type ApiSuccessBody<T> = {
  success: true;
  data: T;
  meta?: unknown;
};

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  init?: Omit<ResponseInit, "status">,
) {
  const body: ApiErrorBody = {
    success: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
  };
  return NextResponse.json(body, { ...init, status });
}

export function apiSuccess<T>(data: T, meta?: unknown, init?: ResponseInit) {
  const body: ApiSuccessBody<T> = {
    success: true,
    data,
    ...(meta === undefined ? {} : { meta }),
  };
  return NextResponse.json(body, init);
}
