"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Magic UI-style animated counter. Counts from 0 → `value` once on mount and
 *  whenever `value` changes. CSS-only motion would be ideal but a tween gives
 *  the dashboard numbers a satisfying feel without dragging in a deps. */
export function NumberTicker({
  value,
  duration = 900,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = React.useState(value)
  const fromRef = React.useRef(value)
  const startRef = React.useRef<number | null>(null)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) {
      setDisplay(to)
      return
    }
    startRef.current = null
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return (
    <span className={cn("tabular-nums", className)}>{format(display)}</span>
  )
}
