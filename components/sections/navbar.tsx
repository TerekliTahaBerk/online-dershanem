import { ChevronDown, Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { navLinks } from "@/lib/content";
import { Container } from "@/components/ui/container";
import { LeadFunnelTrigger } from "@/components/ui/lead-funnel-trigger";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";

export function Navbar() {
  const packageLinks = [
    { label: "TYT-AYT", href: "/tyt" },
    { label: "LGS", href: "/lgs" }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="inline-flex items-center" aria-label="Online Dershanem Ana Sayfa">
          <Image
            src="/onlinedershanem_.png"
            alt="Online Dershanem"
            width={300}
            height={52}
            className="h-9 w-[220px] object-contain object-left"
            unoptimized
            priority
          />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) =>
            item.label === "Paketler" ? (
              <div key={item.label} className="group relative">
                <Link href="/paketler" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-brand">
                  Paketler <ChevronDown className="h-4 w-4" />
                </Link>
                <div className="absolute left-0 top-full z-50 w-44 pt-2">
                  <div className="pointer-events-none rounded-2xl border border-line bg-paper/95 p-2 opacity-0 shadow-soft backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                    {packageLinks.map((pkg) => (
                      <Link
                        key={pkg.label}
                        href={pkg.href}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-ink transition hover:bg-soft hover:text-brand"
                      >
                        {pkg.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={item.label} href={item.href} className="text-sm text-muted transition-colors hover:text-brand">
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ComingSoonButton />
          <LeadFunnelTrigger
            source="navbar_primary"
            eventName="trial_cta_click"
            className="inline-flex items-center justify-center rounded-full bg-anchor px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-pine"
          >
            Ücretsiz Denemeyi Başlat
          </LeadFunnelTrigger>
        </div>
        <button className="md:hidden" aria-label="Menüyü Aç">
          <Menu className="h-5 w-5 text-ink" />
        </button>
      </Container>
    </header>
  );
}
