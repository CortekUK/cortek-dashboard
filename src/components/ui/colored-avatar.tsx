import * as React from "react"

import { cn } from "@/lib/utils"
import { avatarToneFor, TONE_CLASSES, type StatusTone } from "@/lib/status-colors"

function initials(name: string): string {
  const trimmed = (name || "?").trim()
  if (!trimmed) return "?"
  const parts = trimmed.split(/\s+/).slice(0, 2)
  return (
    parts.map((p) => p[0]?.toUpperCase() ?? "").join("") ||
    trimmed[0]!.toUpperCase()
  )
}

export function ColoredAvatar({
  name,
  size = 28,
  tone,
  className,
}: {
  name: string
  size?: number
  tone?: StatusTone
  className?: string
}) {
  const resolvedTone = tone ?? avatarToneFor(name)
  const palette = TONE_CLASSES[resolvedTone]
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 select-none place-items-center rounded-full font-medium uppercase tracking-tight",
        palette.soft,
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.42)),
      }}
    >
      {initials(name)}
    </span>
  )
}
