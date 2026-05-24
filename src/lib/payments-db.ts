import { supabase } from "@/lib/supabase"

export type PaymentKind = "client_in" | "dev_out" | "other_in" | "other_out"
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled"

export type Payment = {
  id: string
  projectId: string
  kind: PaymentKind
  description: string
  amount: number
  currency: string
  status: PaymentStatus
  party: string | null
  occurredOn: string | null
  createdAt: string
}

type PaymentRow = {
  id: string
  project_id: string
  kind: PaymentKind
  description: string
  amount: string | number
  currency: string
  status: PaymentStatus
  party: string | null
  occurred_on: string | null
  created_at: string
}

const COLUMNS =
  "id, project_id, kind, description, amount, currency, status, party, occurred_on, created_at"

function fromRow(r: PaymentRow): Payment {
  return {
    id: r.id,
    projectId: r.project_id,
    kind: r.kind,
    description: r.description,
    amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
    currency: r.currency,
    status: r.status,
    party: r.party,
    occurredOn: r.occurred_on,
    createdAt: r.created_at,
  }
}

export async function listPayments(projectId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("occurred_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as PaymentRow[]).map(fromRow)
}

export async function insertPayment(input: {
  projectId: string
  kind: PaymentKind
  description: string
  amount: number
  currency?: string
  status?: PaymentStatus
  party?: string | null
  occurredOn?: string | null
}): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      project_id: input.projectId,
      kind: input.kind,
      description: input.description.trim(),
      amount: input.amount,
      currency: input.currency ?? "USD",
      status: input.status ?? "pending",
      party: input.party ?? null,
      occurred_on: input.occurredOn ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as PaymentRow)
}

export async function updatePayment(
  id: string,
  patch: Partial<
    Pick<
      Payment,
      "description" | "amount" | "currency" | "status" | "party" | "occurredOn" | "kind"
    >
  >
): Promise<Payment> {
  const row: Record<string, unknown> = {}
  if (patch.description !== undefined) row.description = patch.description
  if (patch.amount !== undefined) row.amount = patch.amount
  if (patch.currency !== undefined) row.currency = patch.currency
  if (patch.status !== undefined) row.status = patch.status
  if (patch.party !== undefined) row.party = patch.party
  if (patch.occurredOn !== undefined) row.occurred_on = patch.occurredOn
  if (patch.kind !== undefined) row.kind = patch.kind
  const { data, error } = await supabase
    .from("payments")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as PaymentRow)
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id)
  if (error) throw error
}

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  client_in: "From client",
  dev_out: "Dev commission",
  other_in: "Other income",
  other_out: "Other expense",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

export function paymentDirection(kind: PaymentKind): "in" | "out" {
  return kind === "client_in" || kind === "other_in" ? "in" : "out"
}
