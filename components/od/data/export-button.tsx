"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/od/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/od/ui/dropdown-menu";

export type ExportButtonProps = {
  /** Endpoint that responds to ?format=csv|xlsx and respects search params */
  endpoint: string;
  /** Optional print-friendly route. If omitted, "Yazdır" item is hidden. */
  printPath?: string;
  /** Forward current page's URL search params (filters etc.) */
  forwardParams?: boolean;
  label?: string;
  size?: "sm" | "md";
};

export function ExportButton({
  endpoint,
  printPath,
  forwardParams = true,
  label = "Dışa Aktar",
  size = "sm",
}: ExportButtonProps) {
  const sp = useSearchParams();

  const buildUrl = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams(forwardParams ? sp.toString() : "");
    params.set("format", format);
    return `${endpoint}?${params.toString()}`;
  };

  const handlePrint = () => {
    if (!printPath) return;
    const params = forwardParams ? sp.toString() : "";
    const url = params ? `${printPath}?${params}` : printPath;
    window.open(url, "_blank", "noopener");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size}>
          <Download className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <a href={buildUrl("xlsx")} download>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-pastel-mint-ink" />
            Excel (.xlsx)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={buildUrl("csv")} download>
            <FileText className="mr-2 h-4 w-4 text-pastel-sky-ink" />
            CSV (.csv)
          </a>
        </DropdownMenuItem>
        {printPath && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handlePrint}>
              <Printer className="mr-2 h-4 w-4 text-pastel-lavender-ink" />
              Yazdır / PDF
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
