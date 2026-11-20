-- Where a receipt's photo or file came from, kept as evidence alongside it:
-- "Camera", "Photo library", "File: <name>" or "Shared from another app".
alter table public.receipts
  add column photo_source text check (char_length(photo_source) <= 300);
