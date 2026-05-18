"use client";

import { useRef } from "react";
import { useToastAction } from "./use-toast-action";

type Props = {
  /** Server action: FormData veya argümansız çağrılır. Promise döner. */
  action: (formData: FormData) => Promise<unknown> | unknown;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  successMessage?: string;
  errorMessage?: string;
  /** Başarılı işlemden sonra formu sıfırla (varsayılan: false). */
  resetOnSuccess?: boolean;
};

/**
 * Server action'ı toast bildirimleriyle saran form sarmalayıcısı.
 * `<form action={...}>` yerine `<ToastForm action={...}>` olarak kullanılır.
 */
export function ToastForm({
  action,
  children,
  className,
  style,
  successMessage = "Kaydedildi",
  errorMessage,
  resetOnSuccess = false,
}: Props) {
  const { runAction, pending } = useToastAction();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        runAction(() => Promise.resolve(action(fd)), {
          successMessage,
          errorMessage,
          onSuccess: () => {
            if (resetOnSuccess) formRef.current?.reset();
          },
        });
      }}
      aria-busy={pending}
    >
      <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {children}
      </fieldset>
    </form>
  );
}
