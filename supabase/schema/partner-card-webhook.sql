-- Provision darkei_partner_card_webhook in Supabase Vault before enabling the trigger.
create or replace function public.verify_partner_card_webhook(
  payload text,
  signature text,
  issued_at bigint
)
returns boolean
language sql
security invoker
set search_path = ''
as $function$
  select case
    when signature ~ '^[0-9a-f]{64}$'
      and length(payload) <= 3000
      and abs(extract(epoch from statement_timestamp()) - issued_at) <= 600
    then exists (
      select 1
      from vault.decrypted_secrets
      where name = 'darkei_partner_card_webhook'
        and sha256(decode(signature, 'hex')) =
          sha256(extensions.hmac(issued_at::text || '.' || payload, decrypted_secret, 'sha256'))
    )
    else false
  end;
$function$;

revoke all on function public.verify_partner_card_webhook(text, text, bigint) from public, anon, authenticated;
grant execute on function public.verify_partner_card_webhook(text, text, bigint) to service_role;

create or replace function public.notify_new_donor_partner_card()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  webhook_key text;
  payload text := jsonb_build_object('donor_id', new.id)::text;
  issued_at bigint := floor(extract(epoch from statement_timestamp()));
begin
  select decrypted_secret into webhook_key
  from vault.decrypted_secrets
  where name = 'darkei_partner_card_webhook';

  if webhook_key is null then
    raise warning 'Partner card webhook is not configured';
    return new;
  end if;

  perform net.http_post(
    url := 'https://yyjdckgnaamfexdvigqk.supabase.co/functions/v1/send-partner-card',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Partner-Card-Issued-At', issued_at::text,
      'X-Partner-Card-Signature', encode(extensions.hmac(issued_at::text || '.' || payload, webhook_key, 'sha256'), 'hex')
    ),
    body := jsonb_build_object('payload', payload),
    timeout_milliseconds := 18000
  );
  return new;
end;
$function$;

revoke execute on function public.notify_new_donor_partner_card() from public, anon, authenticated;

create or replace function public.prepare_partner_card_test(
  test_id uuid,
  test_email text,
  test_name text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  with sample as (
    select floor(extract(epoch from statement_timestamp()))::bigint as issued_at,
      jsonb_build_object('test_record', jsonb_build_object(
        'id', test_id,
        'email', test_email,
        'full_name', test_name,
        'kesher_ref', 'TEST-' || upper(right(test_id::text, 6)),
        'created_at', statement_timestamp()
      ))::text as payload
    where char_length(test_name) between 2 and 80
      and char_length(test_email) between 3 and 254
  )
  select jsonb_build_object(
    'payload', sample.payload,
    'issuedAt', sample.issued_at,
    'signature', encode(extensions.hmac(sample.issued_at::text || '.' || sample.payload, decrypted_secret, 'sha256'), 'hex')
  )
  from sample cross join vault.decrypted_secrets
  where name = 'darkei_partner_card_webhook';
$function$;

revoke all on function public.prepare_partner_card_test(uuid, text, text) from public, anon, authenticated;
grant execute on function public.prepare_partner_card_test(uuid, text, text) to service_role;
