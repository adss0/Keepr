-- The words printed on a receipt, read when it was scanned, so search can find a receipt by any of them.
-- Capped to keep rows small; the app keeps at most 2000 characters.
alter table public.receipts
  add column printed_text text check (char_length(printed_text) <= 4000);
