-- A receipt can be marked as finished with: returned for a refund, claimed on warranty, or archived.
-- Finished receipts stay in the history but have no deadlines or reminders.
alter table public.receipts
  add column closed_reason text check (closed_reason in ('returned', 'claimed', 'archived')),
  add column closed_on date,
  add constraint receipts_closed_together check ((closed_reason is null) = (closed_on is null));
