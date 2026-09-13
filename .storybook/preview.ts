import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "padded",
    // Uygulama tamamen App Router; varsayılan (Pages Router) mock'uyla
    // `useRouter` kullanan bileşenler "app router to be mounted" hatası
    // verip hiç render olmuyordu (ör. StudentAssignmentList).
    nextjs: { appDirectory: true },
    a11y: {
      // E2E taramalarıyla aynı WCAG etiket seti (tests/e2e/helpers/axe.ts).
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"],
        },
      },
      // İhlal, panelde uyarı değil hata olarak görünür; otomasyon da aynı
      // seviyeyi kullanır (tests/storybook/a11y.spec.ts).
      test: "error",
    },
  },
};

export default preview;
