import { Badge } from "@/components/panel/ui/badge";
import {
  getMaterialTypeGlyph,
  getMaterialTypeLabel,
  getMaterialTypeTone,
} from "@/lib/panel/materials";
import type { MaterialType } from "@prisma/client";

type Props = {
  type: MaterialType;
  withGlyph?: boolean;
};

export function MaterialTypeBadge({ type, withGlyph = true }: Props) {
  return (
    <Badge tone={getMaterialTypeTone(type)}>
      {withGlyph ? <span aria-hidden style={{ marginRight: 4 }}>{getMaterialTypeGlyph(type)}</span> : null}
      {getMaterialTypeLabel(type)}
    </Badge>
  );
}
