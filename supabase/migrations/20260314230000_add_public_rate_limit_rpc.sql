create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

create table if not exists private.public_rate_limits (
  scope text not null,
  key_hash text not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (scope, key_hash)
);

alter table private.public_rate_limits enable row level security;

revoke all on table private.public_rate_limits from public, anon, authenticated;
grant all on table private.public_rate_limits to postgres, service_role;

create index if not exists public_rate_limits_updated_at_idx
  on private.public_rate_limits (updated_at);

create or replace function public.check_public_rate_limit(
  p_scope text,
  p_key text,
  p_max_attempts integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_ms bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_scope text := trim(coalesce(p_scope, ''));
  v_key text := trim(coalesce(p_key, ''));
  v_window interval := (greatest(p_window_ms, 1000)::text || ' milliseconds')::interval;
  v_row private.public_rate_limits%rowtype;
begin
  if v_scope = '' or v_key = '' then
    raise exception 'Rate limit scope and key are required.';
  end if;

  if p_max_attempts < 1 then
    raise exception 'Rate limit max attempts must be at least 1.';
  end if;

  insert into private.public_rate_limits as rl (
    scope,
    key_hash,
    attempt_count,
    window_started_at,
    updated_at
  )
  values (
    v_scope,
    md5(v_key),
    1,
    v_now,
    v_now
  )
  on conflict (scope, key_hash) do update
    set attempt_count = case
      when rl.window_started_at + v_window <= v_now then 1
      else rl.attempt_count + 1
    end,
    window_started_at = case
      when rl.window_started_at + v_window <= v_now then v_now
      else rl.window_started_at
    end,
    updated_at = v_now
  returning * into v_row;

  if v_row.attempt_count > p_max_attempts then
    allowed := false;
    remaining := 0;
    retry_after_ms := greatest(
      ceil(extract(epoch from ((v_row.window_started_at + v_window) - v_now)) * 1000)::bigint,
      0
    );
  else
    allowed := true;
    remaining := greatest(p_max_attempts - v_row.attempt_count, 0);
    retry_after_ms := null;
  end if;

  return next;
end;
$$;

revoke all on function public.check_public_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_public_rate_limit(text, text, integer, integer) to service_role;
