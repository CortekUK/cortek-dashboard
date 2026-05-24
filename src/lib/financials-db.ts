import { supabase } from "@/lib/supabase"

export type ProjectFinancials = {
  projectId: string
  totalCost: number | null
  advanceAmount: number | null
  advancePercent: number | null
  advanceReceived: boolean
  advanceExpectedOn: string | null
  advanceReceivedOn: string | null
  devName: string | null
  devCommissionAmount: number | null
  devCommissionPercent: number | null
  devBonusPercent: number | null
  notes: string | null
  updatedAt: string
}

type FinancialsRow = {
  project_id: string
  total_cost: string | number | null
  advance_amount: string | number | null
  advance_percent: string | number | null
  advance_received: boolean
  advance_expected_on: string | null
  advance_received_on: string | null
  dev_name: string | null
  dev_commission_amount: string | number | null
  dev_commission_percent: string | number | null
  dev_bonus_percent: string | number | null
  notes: string | null
  updated_at: string
}

const COLUMNS =
  "project_id, total_cost, advance_amount, advance_percent, advance_received, advance_expected_on, advance_received_on, dev_name, dev_commission_amount, dev_commission_percent, dev_bonus_percent, notes, updated_at"

function num(v: string | number | null): number | null {
  if (v === null || v === undefined) return null
  return typeof v === "string" ? parseFloat(v) : v
}

function fromRow(r: FinancialsRow): ProjectFinancials {
  return {
    projectId: r.project_id,
    totalCost: num(r.total_cost),
    advanceAmount: num(r.advance_amount),
    advancePercent: num(r.advance_percent),
    advanceReceived: r.advance_received,
    advanceExpectedOn: r.advance_expected_on,
    advanceReceivedOn: r.advance_received_on,
    devName: r.dev_name,
    devCommissionAmount: num(r.dev_commission_amount),
    devCommissionPercent: num(r.dev_commission_percent),
    devBonusPercent: num(r.dev_bonus_percent),
    notes: r.notes,
    updatedAt: r.updated_at,
  }
}

function emptyFinancials(projectId: string): ProjectFinancials {
  return {
    projectId,
    totalCost: null,
    advanceAmount: null,
    advancePercent: null,
    advanceReceived: false,
    advanceExpectedOn: null,
    advanceReceivedOn: null,
    devName: null,
    devCommissionAmount: null,
    devCommissionPercent: null,
    devBonusPercent: null,
    notes: null,
    updatedAt: new Date().toISOString(),
  }
}

export async function getProjectFinancials(
  projectId: string
): Promise<ProjectFinancials> {
  const { data, error } = await supabase
    .from("project_financials")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data as FinancialsRow) : emptyFinancials(projectId)
}

export type FinancialsPatch = Partial<
  Omit<ProjectFinancials, "projectId" | "updatedAt">
>

const PATCH_TO_COLUMN: Record<keyof FinancialsPatch, string> = {
  totalCost: "total_cost",
  advanceAmount: "advance_amount",
  advancePercent: "advance_percent",
  advanceReceived: "advance_received",
  advanceExpectedOn: "advance_expected_on",
  advanceReceivedOn: "advance_received_on",
  devName: "dev_name",
  devCommissionAmount: "dev_commission_amount",
  devCommissionPercent: "dev_commission_percent",
  devBonusPercent: "dev_bonus_percent",
  notes: "notes",
}

export async function upsertProjectFinancials(
  projectId: string,
  patch: FinancialsPatch
): Promise<ProjectFinancials> {
  const row: Record<string, unknown> = { project_id: projectId }
  for (const key of Object.keys(patch) as Array<keyof FinancialsPatch>) {
    const value = patch[key]
    if (value === undefined) continue
    row[PATCH_TO_COLUMN[key]] = value
  }
  const { data, error } = await supabase
    .from("project_financials")
    .upsert(row, { onConflict: "project_id" })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as FinancialsRow)
}
