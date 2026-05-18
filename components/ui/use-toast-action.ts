"use client";

/**
 * Helper hook — server action'ları toast bildirimleriyle sarmalar.
 *
 * Kullanım:
 *   const { runAction, pending } = useToastAction();
 *   <form onSubmit={(e) => {
 *     e.preventDefault();
 *     runAction(
 *       () => updateProfileAction(new FormData(e.currentTarget)),
 *       { successMessage: "Profil güncellendi", errorMessage: "Güncellenemedi" }
 *     );
 *   }}>
 */

import { useCallback, useTransition } from "react";
import { useToast } from "@/components/ui/toast";

export type ToastActionOptions = {
  successMessage?: string | null;
  errorMessage?: string;
  /** Hata mesajı için custom formatter — default: err.message */
  formatError?: (err: unknown) => string;
  /** Başarı sonrası callback (UI sıfırlama vb.) */
  onSuccess?: () => void;
  /** Hata sonrası callback */
  onError?: (err: unknown) => void;
};

export function useToastAction() {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const runAction = useCallback(
    <T,>(action: () => Promise<T>, opts: ToastActionOptions = {}): void => {
      const {
        successMessage = "Kaydedildi",
        errorMessage,
        formatError,
        onSuccess,
        onError,
      } = opts;

      startTransition(async () => {
        try {
          await action();
          if (successMessage) {
            toast.success(successMessage);
          }
          onSuccess?.();
        } catch (err) {
          // Next.js redirect/notFound exception'ları normal akış — toast gösterme
          if (
            err instanceof Error &&
            (err.message === "NEXT_REDIRECT" || err.message === "NEXT_NOT_FOUND")
          ) {
            return;
          }
          const message =
            formatError?.(err) ??
            (err instanceof Error ? err.message : "Bilinmeyen hata") ??
            errorMessage ??
            "İşlem başarısız oldu";
          toast.error(errorMessage ?? message);
          onError?.(err);
        }
      });
    },
    [toast],
  );

  return { runAction, pending };
}
