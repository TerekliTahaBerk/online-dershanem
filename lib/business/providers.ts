import "server-only";
export interface AdPlatformProvider { health(): Promise<{ ok: boolean; code: string }>; syncCampaigns(): Promise<{ synced: number }>; }
export interface AccountingProvider { health(): Promise<{ ok: boolean; code: string }>; exportPeriod(input: { startsAt: Date; endsAt: Date }): Promise<{ reference: string }>; }
export interface NotificationProvider { notify(input: { title: string; body: string; href?: string; userIds: string[] }): Promise<void>; }
export class MockAdPlatformProvider implements AdPlatformProvider { async health(){ return { ok: true, code: "MOCK" }; } async syncCampaigns(){ return { synced: 0 }; } }
export class MockAccountingProvider implements AccountingProvider { async health(){ return { ok: true, code: "MOCK" }; } async exportPeriod(){ return { reference: "mock" }; } }

