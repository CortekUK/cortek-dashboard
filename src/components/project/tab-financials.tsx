"use client"

import * as React from "react"
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Coins,
  DollarSign,
  Pencil,
  Percent,
  Save,
  UserRound,
  Wallet,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberTicker } from "@/components/ui/number-ticker"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { TONE_CLASSES, type StatusTone } from "@/lib/status-colors"
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
  const advance = resolveAmountFromPair(total, data.advanceAmount, data.advancePercent)
  const commission = resolveAmountFromPair(
    total,
    data.devCommissionAmount,
    data.devCommissionPercent
  )
  const bonus =
    data.devBonusPercent !== null && total > 0
      ? (total * data.devBonusPercent) / 100
      : 0
  const devPayout = (commission ?? 0) + bonus

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-2 rounded-md border bg-card px-4 py-3">
        <Wallet className="size-5 text-primary" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold tracking-tight">Financials</h2>
          <p className="text-xs text-muted-foreground">
            Project total, advance status, and dev commission. Click any value
            to edit.
          </p>
        </div>
      </header>

      <SummaryGrid
        total={total}
        advance={advance ?? 0}
        advanceReceived={data.advanceReceived}
        devPayout={devPayout}
      />

      <Band title="Project total">
        <FieldRow
          label="Total cost"
          icon={<DollarSign className="size-4" />}
          display={data.totalCost !== null ? fmtMoney(data.totalCost) : null}
          placeholder="Set total project cost"
          editor={(close) => (
            <SingleMoneyEditor
              initial={data.totalCost}
              onCancel={close}
              onSave={async (n) => {
                await save({ totalCost: n })
                close()
              }}
            />
          )}
        />
      </Band>

      <Band title="Advance">
        <FieldRow
          label="Amount"
          icon={<Coins className="size-4" />}
          display={
            advance !== null
              ? renderAmountWithPercent(advance, total, data.advancePercent, data.advanceAmount)
              : null
          }
          placeholder="Set advance"
          editor={(close) => (
            <AmountPercentEditor
              total={total}
              initialAmount={data.advanceAmount}
              initialPercent={data.advancePercent}
              onCancel={close}
              onSave={async ({ amount, percent }) => {
                await save({ advanceAmount: amount, advancePercent: percent })
                close()
              }}
            />
          )}
        />
        <FieldRow
          label="Status"
          icon={
            data.advanceReceived ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <CircleDashed className="size-4 text-muted-foreground" />
            )
          }
          display={
            <StatusPill tone={data.advanceReceived ? "success" : "warning"} dot size="sm">
              {data.advanceReceived ? "Received" : "Not yet"}
            </StatusPill>
          }
          editor={(close) => (
            <ToggleEditor
              initial={data.advanceReceived}
              labelTrue="Received"
              labelFalse="Not yet"
              onCancel={close}
              onSave={async (v) => {
                await save({ advanceReceived: v })
                close()
              }}
            />
          )}
        />
        <FieldRow
          label={data.advanceReceived ? "Received on" : "Expected on"}
          icon={<CalendarClock className="size-4" />}
          display={
            data.advanceReceived
              ? data.advanceReceivedOn
                ? fmtDate(data.advanceReceivedOn)
                : null
              : data.advanceExpectedOn
                ? fmtDate(data.advanceExpectedOn)
                : null
          }
          placeholder={data.advanceReceived ? "Pick date received" : "Pick expected date"}
          editor={(close) => (
            <DateEditor
              initial={data.advanceReceived ? data.advanceReceivedOn : data.advanceExpectedOn}
              onCancel={close}
              onSave={async (d) => {
                await save(
                  data.advanceReceived
                    ? { advanceReceivedOn: d }
                    : { advanceExpectedOn: d }
                )
                close()
              }}
            />
          )}
        />
      </Band>

      <Band title="Dev commission">
        <FieldRow
          label="Developer"
          icon={<UserRound className="size-4" />}
          display={data.devName}
          placeholder="Who's the dev on this?"
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
        <FieldRow
          label="Base commission"
          icon={<Coins className="size-4" />}
          display={
            commission !== null
              ? renderAmountWithPercent(
                  commission,
                  total,
                  data.devCommissionPercent,
                  data.devCommissionAmount
                )
              : null
          }
          placeholder="Set base commission"
          editor={(close) => (
            <AmountPercentEditor
              total={total}
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
        <FieldRow
          label="Bonus"
          icon={<Percent className="size-4" />}
          display={
            data.devBonusPercent !== null
              ? renderBonus(data.devBonusPercent, total)
              : null
          }
          placeholder="Set bonus %"
          editor={(close) => (
            <PercentEditor
              initial={data.devBonusPercent}
              onCancel={close}
              onSave={async (n) => {
                await save({ devBonusPercent: n })
                close()
              }}
            />
          )}
        />
      </Band>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Layout primitives
// ──────────────────────────────────────────────────────────────────────────

function Band({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="divide-y rounded-md border bg-card">{children}</div>
    </section>
  )
}

function FieldRow({
  label,
  icon,
  display,
  placeholder,
  editor,
}: {
  label: string
  icon?: React.ReactNode
  display: React.ReactNode | null
  placeholder?: string
  editor: (close: () => void) => React.ReactNode
}) {
  const [editing, setEditing] = React.useState(false)
  const close = React.useCallback(() => setEditing(false), [])

  return (
    <div className="group flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="flex-1" />
        {!editing && (
          <>
            <span
              className={`text-sm ${
                display === null || display === ""
                  ? "italic text-muted-foreground"
                  : "font-medium"
              }`}
            >
              {display ?? placeholder ?? "—"}
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
      {editing && <div className="pl-7">{editor(close)}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Summary grid
// ──────────────────────────────────────────────────────────────────────────

function SummaryGrid({
  total,
  advance,
  advanceReceived,
  devPayout,
}: {
  total: number
  advance: number
  advanceReceived: boolean
  devPayout: number
}) {
  const net = total - devPayout
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatBox label="Total cost" amount={total} tone="primary" />
      <StatBox
        label="Advance"
        amount={advance}
        tone={advanceReceived ? "success" : "warning"}
        hint={advanceReceived ? "Received" : "Not yet"}
      />
      <StatBox label="Dev payout" amount={devPayout} tone="info" />
      <StatBox
        label="Agency net"
        amount={net}
        tone={net >= 0 ? "success" : "destructive"}
      />
    </div>
  )
}

function StatBox({
  label,
  amount,
  tone,
  hint,
}: {
  label: string
  amount: number
  tone: StatusTone
  hint?: string
}) {
  const palette = TONE_CLASSES[tone]
  return (
    <div className="relative flex flex-col gap-1 overflow-hidden rounded-xl border bg-card p-4">
      <span
        aria-hidden
        className={`absolute -right-6 -top-6 size-20 rounded-full opacity-15 blur-2xl ${palette.dot}`}
      />
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">
        <NumberTicker value={amount} format={fmtMoney} />
      </span>
      {hint && (
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      )}
    </div>
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
        <Save />
        Save
      </Button>
    </div>
  )
}

function SingleMoneyEditor({
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
  total,
  initialAmount,
  initialPercent,
  onCancel,
  onSave,
}: {
  total: number
  initialAmount: number | null
  initialPercent: number | null
  onCancel: () => void
  onSave: (v: { amount: number | null; percent: number | null }) => Promise<void>
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
        ? total > 0
          ? (total * parseFloat(value)) / 100
          : null
        : total > 0
          ? (parseFloat(value) / total) * 100
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
          % of total
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
            ? `≈ ${fmtMoney(preview)} of ${fmtMoney(total)}`
            : `≈ ${fmtPercent(preview)} of ${fmtMoney(total)}`}
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

function PercentEditor({
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
        <span className="text-muted-foreground">%</span>
        <Input
          autoFocus
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
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

function DateEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: string | null
  onCancel: () => void
  onSave: (d: string | null) => Promise<void>
}) {
  const [value, setValue] = React.useState(initial ?? "")
  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        type="date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <EditorButtons
        onCancel={onCancel}
        onSave={() => onSave(value || null)}
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

function ToggleEditor({
  initial,
  labelTrue,
  labelFalse,
  onCancel,
  onSave,
}: {
  initial: boolean
  labelTrue: string
  labelFalse: string
  onCancel: () => void
  onSave: (v: boolean) => Promise<void>
}) {
  const [value, setValue] = React.useState(initial)
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit overflow-hidden rounded-md border text-xs">
        <button
          type="button"
          className={`px-2 py-1 ${
            value
              ? "bg-success text-success-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setValue(true)}
        >
          {labelTrue}
        </button>
        <button
          type="button"
          className={`px-2 py-1 ${
            !value
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setValue(false)}
        >
          {labelFalse}
        </button>
      </div>
      <EditorButtons onCancel={onCancel} onSave={() => onSave(value)} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────
// Formatting + derivations
// ──────────────────────────────────────────────────────────────────────────

function resolveAmountFromPair(
  total: number,
  amount: number | null,
  percent: number | null
): number | null {
  if (amount !== null) return amount
  if (percent !== null && total > 0) return (total * percent) / 100
  if (percent !== null) return 0
  return null
}

function renderAmountWithPercent(
  amount: number,
  total: number,
  percent: number | null,
  rawAmount: number | null
) {
  const pct =
    percent !== null
      ? percent
      : total > 0 && rawAmount !== null
        ? (rawAmount / total) * 100
        : null
  return (
    <span className="font-medium">
      {fmtMoney(amount)}
      {pct !== null && total > 0 && (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          ({fmtPercent(pct)} of total)
        </span>
      )}
    </span>
  )
}

function renderBonus(percent: number, total: number) {
  const amount = total > 0 ? (total * percent) / 100 : 0
  return (
    <span className="font-medium">
      {fmtPercent(percent)}
      {total > 0 && (
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          (= {fmtMoney(amount)})
        </span>
      )}
    </span>
  )
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
