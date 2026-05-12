import React from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Screen, Typography, Skeleton, ErrorState, EmptyState } from "@/components/ui";
import { useStudentLessons } from "@/features/student/queries";
import { LessonCard } from "@/features/student/LessonCard";
import { fmtDay } from "@/utils/date";

export default function StudentLessons() {
  const { data, isLoading, error, refetch } = useStudentLessons();

  return (
    <Screen padded={false} edges={["top"]}>
      <View className="px-5 pt-4 pb-3">
        <Typography variant="displayMd">Derslerim</Typography>
        <Typography variant="bodySm" muted className="mt-1">
          Yaklaşan ve geçmiş tüm derslerin.
        </Typography>
      </View>

      {isLoading ? (
        <View className="px-5 gap-3">
          <Skeleton height={120} rounded="xl" />
          <Skeleton height={120} rounded="xl" />
          <Skeleton height={120} rounded="xl" />
        </View>
      ) : error ? (
        <ErrorState description={(error as Error).message} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Henüz ders yok"
          description="Sana atanan dersler buraya gelecek."
        />
      ) : (
        <FlashList
          data={data}
          keyExtractor={(it) => it.id}
          estimatedItemSize={140}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => <LessonCard lesson={item} />}
          renderSectionHeader={undefined}
        />
      )}
    </Screen>
  );
}

// fmtDay export ensures tree-shake doesn't drop date util when unused.
void fmtDay;
