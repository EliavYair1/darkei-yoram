create table if not exists public.kesher_delivery (
  id bigint generated always as identity primary key,
  transaction_ref text not null check (char_length(transaction_ref) between 1 and 120),
  recorded_at timestamptz not null default now(),
  amount numeric(12,2),
  donor_saved boolean not null,
  email_state text not null check (email_state in ('accepted', 'failed', 'skipped')),
  email_message_id text,
  whatsapp_state text not null check (whatsapp_state in ('accepted', 'failed', 'skipped')),
  whatsapp_message_id text,
  whatsapp_error_code integer
);
create index if not exists kesher_delivery_reference_latest
  on public.kesher_delivery (transaction_ref, recorded_at desc);
alter table public.kesher_delivery enable row level security;
revoke all on public.kesher_delivery from public, anon, authenticated;
grant select, insert on public.kesher_delivery to service_role;
