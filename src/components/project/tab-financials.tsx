"use client"

import * as React from "react"
import { Check, Pencil, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import {
  getProjectFinancials,
  upsertProjectFinancials,
  type FinancialsPatch,
  type ProjectFinancials,
} from "@/lib/financials-db"

export function TabFinancials({ projectId }: { projectId: string }) {
  const [data, setData] = React.useState<ProjectFinancials | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getProjectFinancials(projectId).then((f) => {
      setData(f)
      setLoading(false)
    })
  }, [projectId])

  async function save(patch: FinancialsPatch) {
    const next = await upsertProjectFinancials(projectId, patch)
    setData(next)
  }

  if (loading || !data) return <Skeleton className="h-72 w-full" />

  const total = data.totalCost ?? 0
  const advance = resolveAmount(total, data.advanceAmount, data.advancePercent)
  const commission = resolveAmount(
    total,
    data.devCommissionAmount,
    data.devCommissionPercent
  )
  const devAdvance = resolveAmount(
    commission ?? 0,
    data.devAdvanceAmount,
    data.devAdvancePercent
  )

  return (
    <div className="flex flex-col gap-8">
      {/* Top: total cost */}
      <TotalCostHero
        value={data.totalCost}
        onSave={(n) => save({ totalCost: n })}
      />

      {/* Two-column split */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* PROJECT (money in) */}
        <Panel title="Project" subtitle="What the client owes us">
          <Row
            label="Advance"
            value={
              <AmountPercentDisplay
                amount={advance}
                base={total}
                rawAmount={data.advanceAmount}
                rawPercent={data.advancePercent}
              />
            }
            placeholder="Set advance"
            editor={(close) => (
              <AmountPercentEditor
                base={total}
                baseLabel="of total"
                initialAmount={data.advanceAmount}
                initialPercent={data.advancePercent}
                onCancel={close}
                onSave={async ({ amount, percent }) => {
                  await save({
                    advanceAmount: amount,
                    advancePercent: percent,
                  })
                  close()
                }}
              />
            )}
          />
          <Row
            label="Advance cleared"
            value={
              <ClearedPill
                cleared={data.advanceReceived}
                date={data.advanceReceivedOn}
              />
            }
            editor={(close) => (
              <ClearedEditor
                initialCleared={data.advanceReceived}
                initialExpected={data.advanceExpectedOn}
                initialCleared0n={data.advanceReceivedOn}
                onCancel={close}
                onSave={async ({ cleared, expectedOn, clearedOn }) => {
                  await save({
                    advanceReceived: cleared,
                    advanceExpectedOn: expectedOn,
                    advanceReceivedOn: clearedOn,
                  })
                  close()
                }}
              />
            )}
          />
          <Row
            label="Full cost cleared"
            value={
              <ClearedPill
                cleared={data.finalPaymentReceived}
                date={data.finalPaymentReceivedOn}
              />
            }
            editor={(close) => (
              <ClearedEditor
                initialCleared={data.finalPaymentReceived}
                initialExpected={data.finalPaymentExpectedOn}
                initialCleared0n={data.finalPaymentReceivedOn}
                onCancel={close}
                onSave={async ({ cleared, expectedOn, clearedOn }) => {
                  await save({
                    finalPaymentReceived: cleared,
                    finalPaymentExpectedOn: expectedOn,
                    finalPaymentReceivedOn: clearedOn,
                  })
                  close()
                }}
              />
            )}
          />
        </Panel>

        {/* DEV (money out) */}
        <Panel title="Dev" subtitle="What we owe the dev">
          <Row
            label="Developer"
            value={data.devName}
            placeholder="Who's the dev?"
            editor={(close) => (
              <TextEditor
                initial={data.devName ?? ""}
                placeholder="Dev name"
                onCancel={close}
                onSave={async (v) => {
                  await save({ devName: v.trim() || null })
                  close()
                }}
              />
            )}
          />
          <Row
            label="Commission"
            value={
              <AmountPercentDisplay
                amount={commission}
                base={total}
                rawAmount={data.devCommissionAmount}
                rawPercent={data.devCommissionPercent}
              />
            }
            placeholder="Set commission"
            editor={(close) => (
              <AmountPercentEditor
                base={total}
                baseLabel="of total"
                initialAmount={data.devCommissionAmount}
                initialPercent={data.devCommissionPercent}
                onCancel={close}
                onSave={async ({ amount, percent }) => {
                  await save({
                    devCommissionAmount: amount,
                    devCommissionPercent: percent,
                  })
                  close()
                }}
              />
            )}
          />
          <Row
            label="Advance to dev"
            value={
              <AmountPercentDisplay
                amount={devAdvance}
                base={commission ?? 0}
                rawAmount={data.devAdvanceAmount}
                rawPercent={data.devAdvancePercent}
              />
            }
            placeholder="Set dev advance"
            editor={(close) => (
              <AmountPercentEditor
                base={commission ?? 0}
                baseLabel="of commission"
                initialAmount={data.devAdvanceAmount}
                initialPercent={data.devAdvancePercent}
                onCancel={close}
                onSave={async ({ amount, percent }) => {
                  await save({
                    devAdvanceAmount: amount,
                    devAdvancePercent: percent,
                  })
                  close()
                }}
              />
            )}
          />
          <Row
            label="Advance given"
            value={
              <GivenPill
                given={data.devAdvanceGiven}
                date={data.devAdvanceGivenOn}
              />
            }
            editor={(close) => (
              <GivenEditor
                initialGiven={data.devAdvanceGiven}
                initialGivenOn={data.devAdvanceGivenOn}
                onCancel={close}
                onSave={async ({ given, givenOn }) => {
                  await save({
                    devAdvanceGiven: given,
                    devAdvanceGivenOn: givenOn,
                  })
                  close()
                }}
              />
            )}
          />
        </Panel>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Top: total cost hero
// ──────────────────────────────────────────────────────────────────────────

function TotalCostHero({
  value,
  onSave,
}: {
  value: number | null
  onSave: (n: number | null) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)

  return (
    <div className="rounded-xl border bg-card px-6 py-5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Project total
      </div>
      {editing ? (
        <div className="mt-2 max-w-xs">
          <MoneyEditor
            initial={value}
            onCancel={() => setEditing(false)}
            onSave={async (n) => {
              await onSave(n)
              setEditing(false)
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group mt-1 flex items-baseline gap-3 text-left"
        >
          <span
            className={
              value === null
                ? "text-2xl italic text-muted-foreground"
                : "text-4xl font-semibold tabular-nums tracking-tight"
            }
          >
            {value === null ? "Set total" : fmtMoney(value)}
          </span>
          <Pencil className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Layout primitives
// ──────────────────────────────────────────────────────────────────────────

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between border-b pb-2">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
      <div className="divide-y rounded-md border bg-card">{children}</div>
    </section>
  )
}

function Row({
  label,
  value,
  placeholder,
  editor,
}: {
  label: string
  value: React.ReactNode | null
  placeholder?: string
  editor: (close: () => void) => React.ReactNode
}) {
  const [editing, setEditing] = React.useState(false)
  const close = React.useCallback(() => setEditing(false), [])
  const isEmpty = value === null || value === undefined || value === ""

  return (
    <div className="group flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex-1" />
        {!editing && (
          <>
            <span
              className={
                isEmpty
                  ? "text-sm italic text-muted-foreground"
                  : "text-sm font-medium"
              }
            >
              {isEmpty ? placeholder ?? "—" : value}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Edit ${label}`}
              className="opacity-0 group-hover:opacity-100"
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
          </>
        )}
      </div>
      {editing && <div>{editor(close)}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Display helpers
// ──────────────────────────────────────────────────────────────────────────

function AmountPercentDisplay({
  amount,
  base,
  rawAmount,
  rawPercent,
}: {
  amount: number | null
  base: number
  rawAmount: number | null
  rawPercent: number | null
}) {
  if (amount === null) return null
  const pct =
    rawPercent !== null
      ? rawPercent
      : base > 0 && rawAmount !== null
        ? (rawAmount / base) * 100
        : null
  return (
    <span>
      {fmtMoney(amount)}
      {pct !== null && base > 0 && (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          ({fmtPercent(pct)})
        </span>
      )}
    </span>
  )
}

function ClearedPill({
  cleared,
  date,
}: {
  cleared: boolean
  date: string | null
}) {
  return (
    <StatusPill tone={cleared ? "success" : "warning"} dot size="sm">
      {cleared ? (date ? `Cleared ${fmtDate(date)}` : "Cleared") : "Not yet"}
    </StatusPill>
  )
}

function GivenPill({
  given,
  date,
}: {
  given: boolean
  date: string | null
}) {
  return (
    <StatusPill tone={given ? "success" : "warning"} dot size="sm">
      {given ? (date ? `Given ${fmtDate(date)}` : "Given") : "Not yet"}
    </StatusPill>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Editors
// ──────────────────────────────────────────────────────────────────────────

function EditorButtons({
  onCancel,
  onSave,
  saveDisabled,
}: {
  onCancel: () => void
  onSave: () => void
  saveDisabled?: boolean
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        <X />
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={saveDisabled}>
        <Check />
        Save
      </Button>
    </div>
  )
}

function MoneyEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: number | null
  onCancel: () => void
  onSave: (n: number | null) => Promise<void>
}) {
  const [value, setValue] = React.useState(initial?.toString() ?? "")
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">$</span>
        <Input
          autoFocus
          type="number"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <EditorButtons
        onCancel={onCancel}
        onSave={() => {
          const n = value.trim() === "" ? null : parseFloat(value)
          onSave(n === null || Number.isFinite(n) ? n : null)
        }}
      />
    </div>
  )
}

function AmountPercentEditor({
  base,
  baseLabel,
  initialAmount,
  initialPercent,
  onCancel,
  onSave,
}: {
  base: number
  baseLabel: string
  initialAmount: number | null
  initialPercent: number | null
  onCancel: () => void
  onSave: (v: {
    amount: number | null
    percent: number | null
  }) => Promise<void>
}) {
  const initialMode: "amount" | "percent" =
    initialPercent !== null && initialAmount === null ? "percent" : "amount"
  const [mode, setMode] = React.useState<"amount" | "percent">(initialMode)
  const [value, setValue] = React.useState(
    initialMode === "percent"
      ? initialPercent?.toString() ?? ""
      : initialAmount?.toString() ?? ""
  )

  const preview =
    value.trim() === ""
      ? null
      : mode === "percent"
        ? base > 0
          ? (base * parseFloat(value)) / 100
          : null
        : base > 0
          ? (parseFloat(value) / base) * 100
          : null

  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit overflow-hidden rounded-md border text-xs">
        <button
          type="button"
          className={`px-2 py-1 ${
            mode === "amount"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setMode("amount")}
        >
          $ Amount
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${
            mode === "percent"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setMode("percent")}
        >
          % {baseLabel}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {mode === "amount" ? "$" : "%"}
        </span>
        <Input
          autoFocus
          type="number"
          step={mode === "amount" ? "0.01" : "0.1"}
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={mode === "amount" ? "0.00" : "0"}
        />
      </div>
      {preview !== null && Number.isFinite(preview) && (
        <p className="text-xs text-muted-foreground">
          {mode === "percent"
            ? `≈ ${fmtMoney(preview)} ${baseLabel} (${fmtMoney(base)})`
            : `≈ ${fmtPercent(preview)} ${baseLabel}`}
        </p>
      )}
      <EditorButtons
        onCancel={onCancel}
        onSave={() => {
          if (value.trim() === "") {
            onSave({ amount: null, percent: null })
            return
          }
          const n = parseFloat(value)
          if (!Number.isFinite(n)) return
          onSave(
            mode === "amount"
              ? { amount: n, percent: null }
              : { amount: null, percent: n }
          )
        }}
      />
    </div>
  )
}

function ClearedEditor({
  initialCleared,
  initialExpected,
  initialCleared0n,
  onCancel,
  onSave,
}: {
  initialCleared: boolean
  initialExpected: string | null
  initialCleared0n: string | null
  onCancel: () => void
  onSave: (v: {
    cleared: boolean
    expectedOn: string | null
    clearedOn: string | null
  }) => Promise<void>
}) {
  const [cleared, setCleared] = React.useState(initialCleared)
  const [expectedOn, setExpectedOn] = React.useState(initialExpected ?? "")
  const [clearedOn, setClearedOn] = React.useState(initialCleared0n ?? "")

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit overflow-hidden rounded-md border text-xs">
        <button
          type="button"
          className={`px-2 py-1 ${
            cleared
              ? "bg-success text-success-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setCleared(true)}
        >
          Cleared
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${
            !cleared
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setCleared(false)}
        >
          Not yet
        </button>
      </div>

      {cleared ? (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Cleared on
          <Input
            type="date"
            value={clearedOn}
            onChange={(e) => setClearedOn(e.target.value)}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Expected on
          <Input
            type="date"
            value={expectedOn}
            onChange={(e) => setExpectedOn(e.target.value)}
          />
        </label>
      )}

      <EditorButtons
        onCancel={onCancel}
        onSave={() =>
          onSave({
            cleared,
            expectedOn: cleared ? null : expectedOn || null,
            clearedOn: cleared ? clearedOn || null : null,
          })
        }
      />
    </div>
  )
}

function GivenEditor({
  initialGiven,
  initialGivenOn,
  onCancel,
  onSave,
}: {
  initialGiven: boolean
  initialGivenOn: string | null
  onCancel: () => void
  onSave: (v: { given: boolean; givenOn: string | null }) => Promise<void>
}) {
  const [given, setGiven] = React.useState(initialGiven)
  const [givenOn, setGivenOn] = React.useState(initialGivenOn ?? "")

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit overflow-hidden rounded-md border text-xs">
        <button
          type="button"
          className={`px-2 py-1 ${
            given
              ? "bg-success text-success-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setGiven(true)}
        >
          Given
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${
            !given
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setGiven(false)}
        >
          Not yet
        </button>
      </div>

      {given && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Given on
          <Input
            type="date"
            value={givenOn}
            onChange={(e) => setGivenOn(e.target.value)}
          />
        </label>
      )}

      <EditorButtons
        onCancel={onCancel}
        onSave={() =>
          onSave({
            given,
            givenOn: given ? givenOn || null : null,
          })
        }
      />
    </div>
  )
}

function TextEditor({
  initial,
  placeholder,
  onCancel,
  onSave,
}: {
  initial: string
  placeholder?: string
  onCancel: () => void
  onSave: (v: string) => Promise<void>
}) {
  const [value, setValue] = React.useState(initial)
  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <EditorButtons onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Math + formatting
// ──────────────────────────────────────────────────────────────────────────

function resolveAmount(
  base: number,
  amount: number | null,
  percent: number | null
): number | null {
  if (amount !== null) return amount
  if (percent !== null && base > 0) return (base * percent) / 100
  if (percent !== null) return 0
  return null
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtPercent(n: number): string {
  const rounded = Math.round(n * 10) / 10
  return `${rounded}%`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
