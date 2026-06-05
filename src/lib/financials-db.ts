import { supabase } from "@/lib/supabase"

export type ProjectFinancials = {
  projectId: string
  totalCost: number | null

  // Client side
  advanceAmount: number | null
  advancePercent: number | null
  advanceReceived: boolean
  advanceExpectedOn: string | null
  advanceReceivedOn: string | null
  finalPaymentReceived: boolean
  finalPaymentExpectedOn: string | null
  finalPaymentReceivedOn: string | null

  // Dev side
  devName: string | null
  devCommissionAmount: number | null
  devCommissionPercent: number | null
  devAdvanceAmount: number | null
  devAdvancePercent: number | null
  devAdvanceGiven: boolean
  devAdvanceGivenOn: string | null

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
  final_payment_received: boolean
  final_payment_expected_on: string | null
  final_payment_received_on: string | null
  dev_name: string | null
  dev_commission_amount: string | number | null
  dev_commission_percent: string | number | null
  dev_advance_amount: string | number | null
  dev_advance_percent: string | number | null
  dev_advance_given: boolean
  dev_advance_given_on: string | null
  notes: string | null
  updated_at: string
}

const COLUMNS = [
  "project_id",
  "total_cost",
  "advance_amount",
  "advance_percent",
  "advance_received",
  "advance_expected_on",
  "advance_received_on",
  "final_payment_received",
  "final_payment_expected_on",
  "final_payment_received_on",
  "dev_name",
  "dev_commission_amount",
  "dev_commission_percent",
  "dev_advance_amount",
  "dev_advance_percent",
  "dev_advance_given",
  "dev_advance_given_on",
  "notes",
  "updated_at",
].join(", ")

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
    finalPaymentReceived: r.final_payment_received,
    finalPaymentExpectedOn: r.final_payment_expected_on,
    finalPaymentReceivedOn: r.final_payment_received_on,
    devName: r.dev_name,
    devCommissionAmount: num(r.dev_commission_amount),
    devCommissionPercent: num(r.dev_commission_percent),
    devAdvanceAmount: num(r.dev_advance_amount),
    devAdvancePercent: num(r.dev_advance_percent),
    devAdvanceGiven: r.dev_advance_given,
    devAdvanceGivenOn: r.dev_advance_given_on,
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
    finalPaymentReceived: false,
    finalPaymentExpectedOn: null,
    finalPaymentReceivedOn: null,
    devName: null,
    devCommissionAmount: null,
    devCommissionPercent: null,
    devAdvanceAmount: null,
    devAdvancePercent: null,
    devAdvanceGiven: false,
    devAdvanceGivenOn: null,
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
  return data ? fromRow(data as unknown as FinancialsRow) : emptyFinancials(projectId)
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
  finalPaymentReceived: "final_payment_received",
  finalPaymentExpectedOn: "final_payment_expected_on",
  finalPaymentReceivedOn: "final_payment_received_on",
  devName: "dev_name",
  devCommissionAmount: "dev_commission_amount",
  devCommissionPercent: "dev_commission_percent",
  devAdvanceAmount: "dev_advance_amount",
  devAdvancePercent: "dev_advance_percent",
  devAdvanceGiven: "dev_advance_given",
  devAdvanceGivenOn: "dev_advance_given_on",
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
  return fromRow(data as unknown as FinancialsRow)
}
