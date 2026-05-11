"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { Input } from "@/components/od/ui/input";
import { Badge } from "@/components/od/ui/badge";
import { Button } from "@/components/od/ui/button";
import { parseSmartFilter, type SmartFilterToken } from "@/lib/services/smart-filter/parser";

/**
 * SmartFilterInput — doğal dil filtresi.
 * Örn: "riskli bu hafta", "aktif geçen ay"
 *
 * onChange: kullanıcı text yazdıkça parse edilen token listesi.
 */
export function SmartFilterInput({
  onChange,
  placeholder = 'Akıllı filtre: "riskli bu hafta"',
  className,
}: {
  onChange?: (tokens: SmartFilterToken[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = React.useState("");
  const tokens = React.useMemo(() => parseSmartFilter(text), [text]);
  const lastSentRef = React.useRef("");

  React.useEffect(() => {
    const key = JSON.stringify(tokens);
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;
    onChange?.(tokens);
  }, [tokens, onChange]);

  return (
    <div className={className}>
      <div className="relative">
        <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-od-mint-600" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-od-surface-2"
            aria-label="Temizle"
          >
            <X className="h-3.5 w-3.5 text-od-ink-3" />
          </button>
        )}
      </div>
      {tokens.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tokens.map((t, i) => (
            <Badge key={i} tone="mint" className="text-xs">
              {t.label}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-od-ink-3"
            onClick={() => setText("")}
          >
            Temizle
          </Button>
        </div>
      )}
    </div>
  );
}
