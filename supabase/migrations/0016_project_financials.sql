-- Per-project financial summary. 1:1 with projects.
-- Powers the Financials tab: total cost, advance, dev commission + bonus.

create table public.project_financials (
  project_id              uuid           primary key references public.projects(id) on delete cascade,
  total_cost              numeric(12,2),

  -- Advance: enter either an amount or a percent of total_cost (or both).
  advance_amount          numeric(12,2),
  advance_percent         numeric(5,2),
  advance_received        boolean        not null default false,
  advance_expected_on     date,
  advance_received_on     date,

  -- Dev commission: base entered as amount or percent of total_cost.
  dev_name                text,
  dev_commission_amount   numeric(12,2),
  dev_commission_percent  numeric(5,2),
  dev_bonus_percent       numeric(5,2),

  notes                   text,
  updated_at              timestamptz    not null default now()
);

create trigger project_financials_set_updated_at
before update on public.project_financials
for each row execute function public.set_updated_at();

-- Single-user / app-layer RLS. Match the rest of the workspace tables.
alter table public.project_financials disable row level security;
