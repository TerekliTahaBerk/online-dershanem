"use client";

import { useRef } from "react";

interface Props {
  action: (formData: FormData) => Promise<void> | void;
  hiddenFields: Record<string, string>;
  message: string;
  className?: string;
  children: React.ReactNode;
}

export function ConfirmDeleteButton({ action, hiddenFields, message, className, children }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={action}>
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(message)) e.preventDefault();
        }}
        className={className}
      >
        {children}
      </button>
    </form>
  );
}
