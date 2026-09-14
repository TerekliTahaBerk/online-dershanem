export type PiiRule = { category: string; confidence: "yüksek" | "orta" | "düşük"; parts: readonly string[] };
export type PiiClassification = { category: string; confidence: string; matched: string };

export declare const PII_RULES: readonly PiiRule[];
export declare function classifyFieldName(fieldName: string): PiiClassification | null;
export declare function isCredentialField(fieldName: string): boolean;
export declare function protectionStatus(fieldName: string, sensitiveKeyParts: readonly string[]): string;
