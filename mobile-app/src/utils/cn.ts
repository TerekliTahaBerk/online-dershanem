/** Tailwind className birleştirici (RN için clsx benzeri minimal). */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
