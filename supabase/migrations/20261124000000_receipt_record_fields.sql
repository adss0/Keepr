-- Details returns and claims ask for: the shop's order or receipt number and the item's serial number,
-- plus the user's own notes. The app keeps the same limits.
alter table public.receipts
  add column order_number text check (char_length(order_number) <= 100),
  add column serial_number text check (char_length(serial_number) <= 100),
  add column notes text check (char_length(notes) <= 1000);
