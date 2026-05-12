import { create } from "zustand";

export type ColorScheme = "light" | "dark" | "system";

interface UIState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  bottomSheetOpen: boolean;
  setBottomSheetOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  colorScheme: "dark",
  setColorScheme: (colorScheme) => set({ colorScheme }),
  bottomSheetOpen: false,
  setBottomSheetOpen: (bottomSheetOpen) => set({ bottomSheetOpen }),
}));
