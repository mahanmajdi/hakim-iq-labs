-- =====================================================================
-- Hakim IQ Labs — Gmail-only sign-ups (server-side rule)
-- Run in Supabase → SQL Editor after schema.sql.
--
-- Used while "Confirm email" is OFF: new accounts must use a correctly
-- formed Gmail address. The website checks this too, but this trigger is
-- what actually enforces it — even for requests that bypass the site.
--
-- Gmail username rules: 6–30 letters/numbers, single dots allowed between
-- them (not first/last, never two in a row), no "+" aliases.
-- Note: this checks the address format only; without a verification email
-- nobody can prove the person owns the inbox.
-- =====================================================================

create or replace function public.is_valid_gmail(addr text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(coalesce(addr, '')) ~ '^[a-z0-9](\.?[a-z0-9]){5,29}@(gmail|googlemail)\.com$';
$$;

create or replace function public.enforce_gmail_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_valid_gmail(new.email) then
    raise exception 'Only real Gmail addresses can sign up'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_gmail_signup on auth.users;
create trigger enforce_gmail_signup
  before insert on auth.users
  for each row execute function public.enforce_gmail_signup();

-- Quick self-test (returns true/false rows; inserts nothing)
select addr, public.is_valid_gmail(addr) as allowed
from (values
  ('john.smith@gmail.com'),
  ('JohnSmith99@Gmail.com'),
  ('john..smith@gmail.com'),
  ('.john@gmail.com'),
  ('john+spam@gmail.com'),
  ('abc@gmail.com'),
  ('john@yahoo.com'),
  ('john@gmail.co')
) as t(addr);
