"use client";

import { useEffect, useState, type ReactNode } from "react";
import { marketingApplicationUrl, type MarketingProduct } from "@/lib/marketing-application";

/** Real same-tab anchor works without JS and in social in-app browsers. */
export function MarketingApplicationLink({ product, children = "Ücretsiz Ön Görüşmeye Başvur", className }: {
  product?: MarketingProduct;
  children?: ReactNode;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  useEffect(() => { setSearch(window.location.search); }, []);
  return <a href={marketingApplicationUrl(product, search)} className={className}>{children}</a>;
}
