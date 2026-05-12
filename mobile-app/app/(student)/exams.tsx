import React from "react";
import { View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Screen, Typography, Skeleton, ErrorState, EmptyState, Card, Badge } from "@/components/ui";
import { useStudentExams } from "@/features/student/queries";
import { fmtFull } from "@/utils/date";
import { fmtNumber } from "@/utils/format";

export default function StudentExams() {
  const { data, isLoading, error, refetch } = useStudentExams();

  return (
    <Screen padded={false} edges={["top"]}>
      <View className="px-5 pt-4 pb-3">
        <Typography variant="displayMd">Denemeler</Typography>
        <Typography variant="bodySm" muted className="mt-1">
          Tüm deneme sonuçların ve gelişimin.
        </Typography>
      </View>

      {isLoading ? (
        <View className="px-5 gap-3">
          <Skeleton height={120} rounded="xl" />
          <Skeleton height={120} rounded="xl" />
        </View>
      ) : error ? (
        <ErrorState description={(error as Error).message} onRetry={refetch} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="Henüz deneme sonucun yok"
          description="Çözdüğün denemeler ve gelişim grafiğin burada görünecek."
        />
      ) : (
        <FlashList
          data={data}
          keyExtractor={(it) => it.id}
          estimatedItemSize={150}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Card pressable onPress={() => undefined}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Typography variant="h3" numberOfLines={1}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" muted className="mt-1">
                    {fmtFull(item.takenAt)}
                  </Typography>
                </View>
                {item.examType ? <Badge label={item.examType} tone="brand" /> : null}
              </View>
              <View className="flex-row gap-4 mt-3">
                <Stat label="Net" value={item.net != null ? fmtNumber(item.net) : "—"} />
                <Stat label="Doğru" value={`${item.correct}`} />
                <Stat label="Yanlış" value={`${item.wrong}`} />
                <Stat label="Boş" value={`${item.blank}`} />
                <Stat label="Sıra" value={item.ranking ? `${item.ranking}` : "—"} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Typography variant="caption" muted>
        {label}
      </Typography>
      <Typography variant="h3" className="mt-0.5">
        {value}
      </Typography>
    </View>
  );
}
