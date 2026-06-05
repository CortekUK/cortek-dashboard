-- Rebuild project_financials to match the new UI sketch:
--   * Track when the full project cost has been cleared (final payment from client).
--   * Track a separate dev-side advance (payment to the dev), mirroring the
--     amount-or-percent pattern we use for the client advance. Percent here is
--     of the dev's commission, not the project total.
--   * Drop dev_bonus_percent — added in 0016 but never surfaced; the new UI
--     drops the bonus concept entirely.

alter table public.project_financials
  add column if not exists final_payment_received      boolean      not null default false,
  add column if not exists final_payment_expected_on   date,
  add column if not exists final_payment_received_on   date,
  add column if not exists dev_advance_amount          numeric(12,2),
  add column if not exists dev_advance_percent         numeric(5,2),
  add column if not exists dev_advance_given           boolean      not null default false,
  add column if not exists dev_advance_given_on        date;

alter table public.project_financials
  drop column if exists dev_bonus_percent;
