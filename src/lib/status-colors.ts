import type { PaymentKind, PaymentStatus } from "@/lib/payments-db"
import type { ProjectStage } from "@/lib/projects-db"
import type { RequirementStatus } from "@/lib/requirements-db"
import type { TaskPriority, TaskStatus } from "@/lib/tasks-db"

export type StatusTone =
  | "neutral"
  | "info"
  | "warning"
  | "success"
  | "primary"
  | "destructive"

/** Tailwind class fragments for a given tone. Designed for the StatusPill
 *  primitive; centralised here so every status surface stays in sync.
 *
 *  Three usages:
 *   - solid:   strong colored background, light fg
 *   - soft:    tinted background + colored text + tinted border
 *   - dot:     small color dot (e.g. inside a list item) */
export const TONE_CLASSES: Record<
  StatusTone,
  { solid: string; soft: string; dot: string; ring: string; text: string }
> = {
  neutral: {
    solid: "bg-muted text-muted-foreground",
    soft: "bg-muted/70 text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
    ring: "ring-border",
    text: "text-muted-foreground",
  },
  info: {
    solid: "bg-info text-info-foreground",
    soft: "bg-info/10 text-info border-info/25",
    dot: "bg-info",
    ring: "ring-info/40",
    text: "text-info",
  },
  warning: {
    solid: "bg-warning text-warning-foreground",
    soft: "bg-warning/12 text-warning border-warning/25",
    dot: "bg-warning",
    ring: "ring-warning/40",
    text: "text-warning",
  },
  success: {
    solid: "bg-success text-success-foreground",
    soft: "bg-success/12 text-success border-success/25",
    dot: "bg-success",
    ring: "ring-success/40",
    text: "text-success",
  },
  primary: {
    solid: "bg-primary text-primary-foreground",
    soft: "bg-primary/12 text-primary border-primary/25",
    dot: "bg-primary",
    ring: "ring-primary/40",
    text: "text-primary",
  },
  destructive: {
    solid: "bg-destructive text-destructive-foreground",
    soft: "bg-destructive/12 text-destructive border-destructive/30",
    dot: "bg-destructive",
    ring: "ring-destructive/40",
    text: "text-destructive",
  },
}

export const TASK_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  not_started: "neutral",
  in_progress: "info",
  in_review: "warning",
  completed: "success",
}

export const TASK_PRIORITY_TONE: Record<TaskPriority, StatusTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "destructive",
}

export const PROJECT_STAGE_TONE: Record<ProjectStage, StatusTone> = {
  demo: "info",
  in_progress: "primary",
  archived: "neutral",
}

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, StatusTone> = {
  pending: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "neutral",
}

export const REQUIREMENT_STATUS_TONE: Record<RequirementStatus, StatusTone> = {
  open: "warning",
  received: "success",
}

export const PAYMENT_KIND_TONE: Record<PaymentKind, StatusTone> = {
  client_in: "success",
  other_in: "success",
  dev_out: "primary",
  other_out: "neutral",
}

/** Deterministic avatar accent for a person's name — used by thread
 *  comments + assignee chips so the same author keeps the same colour. */
const AVATAR_PALETTE: StatusTone[] = [
  "primary",
  "info",
  "success",
  "warning",
  "destructive",
]

export function avatarToneFor(name: string): StatusTone {
  const trimmed = (name || "?").trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash * 31 + trimmed.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

/** Project-specific deterministic accent — used on Kanban cards so each
 *  phase reads as a distinct visual unit. */
const PHASE_PALETTE: StatusTone[] = [
  "primary",
  "info",
  "success",
  "warning",
]

export function phaseToneFor(phaseId: string | null): StatusTone {
  if (!phaseId) return "neutral"
  let hash = 0
  for (let i = 0; i < phaseId.length; i++) {
    hash = (hash * 31 + phaseId.charCodeAt(i)) >>> 0
  }
  return PHASE_PALETTE[hash % PHASE_PALETTE.length]
}
