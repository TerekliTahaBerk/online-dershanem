/** Geçiş anahtarı bu cihazda Face ID / parmak izi ile kullanılabilir mi? */
export function credentialIsPlatformBound(input: { transports: readonly string[]; deviceType: string }) {
  return input.transports.includes("internal") || input.deviceType === "singleDevice";
}

export function mapWebAuthnClientError(error: unknown): string {
  if (!(error instanceof Error)) return "Doğrulama tamamlanamadı. Lütfen tekrar deneyin.";
  const message = error.message.toLowerCase();
  if (
    message.includes("not allowed by the user agent") ||
    message.includes("not allowed by the platform") ||
    message.includes("operation either timed out") ||
    message.includes("abort") ||
    message.includes("cancel")
  ) {
    return "Bu telefonda kayıtlı geçiş anahtarı bulunamadı veya işlem iptal edildi. Doğrulama uygulaması kodunu veya kurtarma kodunu kullanın.";
  }
  if (message.includes("no available authenticator")) {
    return "Uyumlu geçiş anahtarı bulunamadı. Uygulama kodunu veya kurtarma kodunu deneyin.";
  }
  return error.message;
}
