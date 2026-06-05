"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Wallet } from "lucide-react"

import { StatusPill } from "@/components/ui/status-pill"
import {
  getProjectFinancials,
  type ProjectFinancials,
} from "@/lib/financials-db"

const currency = new Intl.NumberFormat("en", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
})

function fmt(amount: number | null): string {
  if (amount === null) return "—"
  return currency.format(amount)
}

export function DashboardFinancialsSnapshot({
  projectId,
}: {
  projectId: string
}) {
  const [data, setData] = React.useState<ProjectFinancials | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await getProjectFinancials(projectId)
        if (!cancelled) setData(rows)
      } catch {
        /* swallow */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const total = data?.totalCost ?? null
  const advanceAmount = data?.advanceAmount ?? null
  const finalDue =
    total !== null && advanceAmount !== null ? total - advanceAmount : null
  const advanceIn = data?.advanceReceived ?? false
  const finalIn = data?.finalPaymentReceived ?? false
  const devOwed =
    (data?.devCommissionAmount ?? null) !== null &&
    (data?.devAdvanceAmount ?? 0) !== null
      ? (data!.devCommissionAmount ?? 0) - (data!.devAdvanceAmount ?? 0)
      : null

  return (
    <Link
      href={`/projects/${projectId}?tab=financials`}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <header className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Wallet className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">Financials</span>
          <span className="text-[11px] text-muted-foreground">
            Total {fmt(total)} · dev commission {fmt(data?.devCommissionAmount ?? null)}
          </span>
        </div>
        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </header>

      {data === null ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Row label="Advance" amount={advanceAmount} received={advanceIn} />
          <Row label="Final payment" amount={finalDue} received={finalIn} />
          <Row
            label="Dev paid"
            amount={data.devAdvanceAmount}
            received={data.devAdvanceGiven}
          />
          <Row label="Dev outstanding" amount={devOwed} muted />
        </div>
      )}
    </Link>
  )
}

function Row({
  label,
  amount,
  received,
  muted,
}: {
  label: string
  amount: number | null
  received?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border bg-background/40 px-2.5 py-1.5">
      <span className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {received !== undefined && (
          <StatusPill tone={received ? "success" : "neutral"} dot size="sm">
            {received ? "in" : "due"}
          </StatusPill>
        )}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          muted ? "text-muted-foreground" : ""
        }`}
      >
        {fmt(amount)}
      </span>
    </div>
  )
}
