export declare const REDACTED_VALUE: "[REDACTED]";
export declare const SENSITIVE_KEY_PARTS: readonly string[];
export declare function isSensitiveKey(key: string): boolean;
export declare function redactSensitiveValue(value: unknown, seen?: WeakSet<object>): unknown;
