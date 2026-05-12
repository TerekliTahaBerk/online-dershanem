import React from "react";
import { View, Pressable } from "react-native";
import { Card, Typography, Badge } from "@/components/ui";
import type { LessonCard as LessonCardType } from "@/types/api";
import { fmtTime, fmtDay } from "@/utils/date";
import { haptics } from "@/lib/haptics";

interface Props {
  lesson: LessonCardType;
  onPress?: () => void;
  onJoin?: () => void;
}

export function LessonCard({ lesson, onPress, onJoin }: Props) {
  return (
    <Card pressable onPress={onPress} className="gap-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Typography variant="h3" numberOfLines={1}>
            {lesson.title ?? lesson.subject ?? "Ders"}
          </Typography>
          <Typography variant="caption" className="mt-1">
            {lesson.teacher.fullName}
          </Typography>
        </View>
        <Badge label={`${fmtDay(lesson.scheduledAt)} · ${fmtTime(lesson.scheduledAt)}`} tone="brand" />
      </View>

      {lesson.meetLink ? (
        <Pressable
          onPress={() => {
            haptics.medium();
            onJoin?.();
          }}
          className="bg-brand h-10 rounded-xl items-center justify-center"
        >
          <Typography variant="bodySm" className="text-white font-semibold">
            Canlı derse katıl
          </Typography>
        </Pressable>
      ) : null}
    </Card>
  );
}
