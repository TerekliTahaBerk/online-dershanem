import React from "react";
import { View, Pressable } from "react-native";
import { Card, Typography } from "@/components/ui";
import type { DailyTask } from "@/types/api";
import { fmtTime } from "@/utils/date";
import { haptics } from "@/lib/haptics";

interface Props {
  task: DailyTask;
  onToggle: (task: DailyTask) => void;
  onPress?: (task: DailyTask) => void;
}

const sourceIcon: Record<DailyTask["sourceType"], string> = {
  ASSIGNMENT: "📚",
  LESSON: "🎓",
  EXAM: "📝",
  GOAL: "🎯",
  MANUAL: "✓",
};

export function TaskItem({ task, onToggle, onPress }: Props) {
  return (
    <Card pressable onPress={() => onPress?.(task)} className="flex-row items-center gap-3 py-3">
      <Pressable
        hitSlop={10}
        onPress={() => {
          haptics.success();
          onToggle(task);
        }}
        className={`h-7 w-7 rounded-full border-2 items-center justify-center ${
          task.isDone ? "bg-success border-success" : "border-bg-border"
        }`}
      >
        {task.isDone ? (
          <Typography variant="bodySm" className="text-white font-bold">
            ✓
          </Typography>
        ) : null}
      </Pressable>
      <View className="flex-1">
        <Typography
          variant="body"
          numberOfLines={1}
          className={task.isDone ? "line-through text-ink-dim" : undefined}
        >
          {sourceIcon[task.sourceType]}  {task.title}
        </Typography>
        {task.dueAt ? (
          <Typography variant="caption" muted>
            Son: {fmtTime(task.dueAt)}
          </Typography>
        ) : null}
      </View>
    </Card>
  );
}
