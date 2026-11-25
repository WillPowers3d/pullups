import type { SessionStatus, SessionType } from "@/lib/train/engine/types";

export const TYPE_LABEL: Record<SessionType, string> = {
  pull: "Pull",
  cross: "Cross",
  max_test: "Max test",
  pr_attempt: "PR attempt",
};

export const TYPE_ICON: Record<SessionType, string> = {
  pull: "💪",
  cross: "🔁",
  max_test: "🎯",
  pr_attempt: "🏆",
};

export const STATUS_LABEL: Record<SessionStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
  missed: "Missed",
  skipped: "Skipped",
};
