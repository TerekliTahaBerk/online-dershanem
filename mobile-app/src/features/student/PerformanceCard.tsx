import React from "react";
import { View } from "react-native";
import { Card, Typography } from "@/components/ui";
import type { PerformanceSummary } from "@/types/api";
import { fmtNumber, fmtPercent } from "@/utils/format";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Typography variant="h2">{value}</Typography>
      <Typography variant="caption" muted className="mt-1 text-center">
        {label}
      </Typography>
    </View>
  );
}

export function PerformanceCard({ data }: { data: PerformanceSummary }) {
  return (
    <Card variant="elevated">
      <View className="flex-row items-center justify-between mb-4">
        <Typography variant="h3">Performansım</Typography>
        {data.streakDays > 0 ? (
          <Typography variant="bodySm" className="text-warning font-semibold">
            🔥 {data.streakDays} gün
          </Typography>
        ) : null}
      </View>
      <View className="flex-row gap-3">
        <Stat
          label="Haftalık Net"
          value={data.weeklyNetAvg != null ? fmtNumber(data.weeklyNetAvg) : "—"}
        />
        <Stat
          label="Devam"
          value={data.attendancePercent != null ? fmtPercent(data.attendancePercent / 100) : "—"}
        />
        <Stat label="Ödev" value={`${data.completedAssignments}`} />
      </View>
      {data.weeklyGoal ? (
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-2">
            <Typography variant="label">Haftalık Hedef</Typography>
            <Typography variant="caption" muted>
              {data.weeklyGoal.current}/{data.weeklyGoal.target} {data.weeklyGoal.unit}
            </Typography>
          </View>
          <View className="h-2 bg-bg-border rounded-full overflow-hidden">
            <View
              className="h-2 bg-brand rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  (data.weeklyGoal.current / Math.max(1, data.weeklyGoal.target)) * 100,
                )}%`,
              }}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
