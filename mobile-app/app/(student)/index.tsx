import React, { useCallback, useState } from "react";
import { View, RefreshControl } from "react-native";
import { Screen, Typography, Skeleton, ErrorState, Card } from "@/components/ui";
import { useStudentDashboard } from "@/features/student/queries";
import { useAuth } from "@/providers/AuthProvider";
import { TaskItem } from "@/features/student/TaskItem";
import { LessonCard } from "@/features/student/LessonCard";
import { PerformanceCard } from "@/features/student/PerformanceCard";
import { studentApi } from "@/api/student";
import { useQueryClient } from "@tanstack/react-query";
import { studentKeys } from "@/features/student/queries";
import { fmtDay } from "@/utils/date";

export default function StudentHome() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useStudentDashboard();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onToggleTask = useCallback(
    async (taskId: string) => {
      qc.setQueryData(studentKeys.dashboard, (prev: typeof data | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          todayTasks: prev.todayTasks.map((t) =>
            t.id === taskId
              ? { ...t, isDone: !t.isDone, doneAt: !t.isDone ? new Date().toISOString() : null }
              : t,
          ),
        };
      });
      try {
        await studentApi.toggleTask(taskId);
      } catch {
        await refetch();
      }
    },
    [qc, refetch],
  );

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C5CFF" />}>
      <View className="pt-4 pb-2">
        <Typography variant="caption" muted>
          {fmtDay(new Date())}
        </Typography>
        <Typography variant="displayMd">Merhaba, {user?.name?.split(" ")[0] ?? "öğrenci"} 👋</Typography>
      </View>

      {isLoading ? <DashboardSkeleton /> : null}
      {error ? <ErrorState description={(error as Error).message} onRetry={refetch} /> : null}

      {data ? (
        <View className="gap-5 mt-2">
          {/* Bugünkü görevler */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Typography variant="h2">Bugünün Görevleri</Typography>
              <Typography variant="caption" muted>
                {data.todayTasks.filter((t) => !t.isDone).length} kalan
              </Typography>
            </View>
            {data.todayTasks.length === 0 ? (
              <Card>
                <Typography variant="bodySm" muted>
                  Bugün için aktif görev yok. Bu da kötü değil ✨
                </Typography>
              </Card>
            ) : (
              <View className="gap-2">
                {data.todayTasks.map((t) => (
                  <TaskItem key={t.id} task={t} onToggle={(task) => onToggleTask(task.id)} />
                ))}
              </View>
            )}
          </View>

          {/* Bugünkü dersler */}
          <View className="gap-3">
            <Typography variant="h2">Bugünkü Dersler</Typography>
            {data.todayLessons.length === 0 ? (
              <Card>
                <Typography variant="bodySm" muted>
                  Bugün planlı dersin yok.
                </Typography>
              </Card>
            ) : (
              <View className="gap-3">
                {data.todayLessons.map((l) => (
                  <LessonCard key={l.id} lesson={l} />
                ))}
              </View>
            )}
          </View>

          {/* Performans */}
          <PerformanceCard data={data.performance} />

          {/* Bildirimler önizleme */}
          {data.notifications.length > 0 ? (
            <View className="gap-3">
              <Typography variant="h2">Son Bildirimler</Typography>
              <View className="gap-2">
                {data.notifications.slice(0, 4).map((n) => (
                  <Card key={n.id}>
                    <Typography variant="bodySm" className="font-semibold">
                      {n.title}
                    </Typography>
                    <Typography variant="caption" muted className="mt-1">
                      {n.body}
                    </Typography>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          {/* Motivasyon */}
          {data.motivation ? (
            <Card variant="elevated" className="bg-brand/10 border-brand/30">
              <Typography variant="bodySm" className="italic">
                “{data.motivation.quote}”
              </Typography>
              {data.motivation.author ? (
                <Typography variant="caption" muted className="mt-2">
                  — {data.motivation.author}
                </Typography>
              ) : null}
            </Card>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function DashboardSkeleton() {
  return (
    <View className="gap-3 mt-4">
      <Skeleton height={24} width={180} />
      <Skeleton height={64} rounded="xl" />
      <Skeleton height={64} rounded="xl" />
      <Skeleton height={140} rounded="xl" />
      <Skeleton height={120} rounded="xl" />
    </View>
  );
}
