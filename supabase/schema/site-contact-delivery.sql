create table public.site_contact_delivery (
  contact_id uuid primary key references public.contacts(id) on delete cascade,
  created_at timestamptz not null default now(),
  email_status text not null default 'pending',
  email_message_id text,
  whatsapp_status text not null default 'pending',
  whatsapp_message_id text
);

alter table public.site_contact_delivery enable row level security;
revoke all on public.site_contact_delivery from public, anon, authenticated;
grant select, insert, update on public.site_contact_delivery to service_role;

create index site_contact_delivery_created_at_idx on public.site_contact_delivery (created_at desc);

create or replace trigger on_new_contact
after insert on public.contacts
for each row
when (new.source_detail is distinct from 'אתר דרכי יורם · טופס באתר')
execute function public.notify_new_contact();
