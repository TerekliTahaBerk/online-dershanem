import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Screen, Typography, Skeleton, ErrorState, EmptyState, Badge } from "@/components/ui";
import { useStudentAssignments } from "@/features/student/queries";
import type { AssignmentCard as AC } from "@/types/api";
import { Card } from "@/components/ui";
import { fmtDay } from "@/utils/date";
import { haptics } from "@/lib/haptics";

const FILTERS: Array<{ key: AC["status"] | "ALL"; label: string }> = [
  { key: "ALL", label: "Tümü" },
  { key: "PENDING", label: "Yapılacak" },
  { key: "SUBMITTED", label: "Teslim" },
  { key: "GRADED", label: "Değerlendirilen" },
  { key: "LATE", label: "Geciken" },
];

export default function StudentTasks() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("ALL");
  const { data, isLoading, error, refetch } = useStudentAssignments(
    filter === "ALL" ? undefined : filter,
  );

  return (
    <Screen padded={false} edges={["top"]}>
      <View className="px-5 pt-4 pb-3">
        <Typography variant="displayMd">Görevler</Typography>
      </View>

      <View className="flex-row gap-2 px-5 pb-3">
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => {
              haptics.selection();
              setFilter(f.key);
            }}
            className={`px-3 h-9 rounded-full items-center justify-center ${
              filter === f.key ? "bg-brand" : "bg-bg-elev border border-bg-border"
            }`}
          >
            <Typography
              variant="caption"
              className={filter === f.key ? "text-white font-semibold" : "text-ink-muted"}
            >
              {f.label}
            </Typography>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View className="px-5 gap-3">
          <Skeleton height={92} rounded="xl" />
          <Skeleton height={92} rounded="xl" />
        </View>
      ) : error ? (
        <ErrorState description={(error as Error).message} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Şu an görev yok" description="Yeni ödev atandığında burada görünecek." />
      ) : (
        <FlashList
          data={data}
          keyExtractor={(it) => it.id}
          estimatedItemSize={100}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => <AssignmentRow assignment={item} />}
        />
      )}
    </Screen>
  );
}

function statusTone(s: AC["status"]) {
  return (
    {
      PENDING: "warning",
      SUBMITTED: "info",
      GRADED: "success",
      LATE: "danger",
      MISSED: "danger",
    } as const
  )[s];
}

function AssignmentRow({ assignment }: { assignment: AC }) {
  return (
    <Card pressable onPress={() => undefined}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Typography variant="h3" numberOfLines={1}>
            {assignment.title}
          </Typography>
          <Typography variant="caption" muted className="mt-1">
            {assignment.teacher.fullName}
            {assignment.subject ? ` · ${assignment.subject}` : ""}
            {assignment.dueAt ? ` · Son: ${fmtDay(assignment.dueAt)}` : ""}
          </Typography>
        </View>
        <Badge label={assignment.status} tone={statusTone(assignment.status)} />
      </View>
    </Card>
  );
}
