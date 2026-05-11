import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/od/ui/card";
import { Badge } from "@/components/od/ui/badge";

export type SettingsCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  external?: boolean;
};

export function SettingsCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
  external,
}: SettingsCardProps) {
  const inner = (
    <Card className="h-full transition-all hover:shadow-od-md hover:-translate-y-0.5">
      <CardContent className="space-y-od-2 py-od-4">
        <div className="flex items-start justify-between">
          <div className="rounded-od bg-pastel-sky-soft p-od-2">
            <Icon className="h-5 w-5 text-pastel-sky-ink" />
          </div>
          {badge && <Badge tone="lavender">{badge}</Badge>}
        </div>
        <h3 className="text-od-h3 font-semibold text-od-ink">{title}</h3>
        <p className="text-od-small text-od-mute">{description}</p>
      </CardContent>
    </Card>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link href={href}>{inner}</Link>;
}
