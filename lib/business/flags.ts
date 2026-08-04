export const businessFlags = {
  panel: process.env.CRM_PANEL_ENABLED !== "false",
  instagram: process.env.INSTAGRAM_INTEGRATION_ENABLED === "true",
  ai: process.env.INSTAGRAM_AI_ENABLED === "true",
  finance: process.env.FINANCE_PANEL_ENABLED !== "false",
  metaAds: process.env.META_ADS_INTEGRATION_ENABLED === "true",
} as const;

