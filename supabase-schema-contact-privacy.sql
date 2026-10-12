-- ============================================
-- CONTACT PRIVACY
-- Driver and passenger phone numbers are shared only on the departure day.
-- ============================================
-- Run this AFTER you have deployed the updated Edge Functions and replaced
-- the frontend files (AuthContext, DriverProfile, AdminVerifications,
-- Bookings, MyTrips, BookTrip, ContactDetails). It takes away the ability to
-- read phone numbers straight from the tables, and the old pages still try.

-- --------------------------------------------
-- 1. Stop copying phone numbers into trips and bookings
-- --------------------------------------------
-- trips and bookings used to carry a copy of the phone number, readable by
-- anyone who could see the row. These triggers blank the columns on every
-- insert and update, so no page (old or new) can put a number back.
create or replace function public.blank_copied_phones()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'trips' then
    new.driver_phone := null;
  elsif tg_table_name = 'bookings' then
    new.driver_phone := null;
    new.passenger_phone := null;
  end if;
  return new;
end;
$$;

drop trigger if exists blank_trip_phone on public.trips;
create trigger blank_trip_phone
  before insert or update on public.trips
  for each row execute function public.blank_copied_phones();

drop trigger if exists blank_booking_phones on public.bookings;
create trigger blank_booking_phones
  before insert or update on public.bookings
  for each row execute function public.blank_copied_phones();

-- Clear the copies that already exist
update public.trips set driver_phone = null where driver_phone is not null;
update public.bookings set driver_phone = null, passenger_phone = null
  where driver_phone is not null or passenger_phone is not null;

-- --------------------------------------------
-- 2. Hide phone and email on the users table
-- --------------------------------------------
-- The "Anyone can view driver profiles" policy lets every signed-in user
-- read a driver's whole row, phone and email included. Row policies can't
-- hide single columns, so we take away read access to those two columns and
-- hand each person their own row through get_my_profile() instead.
revoke select on public.users from anon;
revoke select on public.users from authenticated;

grant select (
  id, full_name, user_type, verified, created_at,
  avatar_url, vehicle, route, rating, trips, about_me
) on public.users to authenticated;

-- Your own full profile (including phone and email)
create or replace function public.get_my_profile()
returns setof public.users
language sql
security definer
set search_path = public
stable
as $$
  select * from public.users where id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- --------------------------------------------
-- 3. The only way to get the other person's number
-- --------------------------------------------
-- Works for the passenger (gets the driver's number) and for the driver
-- (gets the passenger's number), and only when:
--   * the driver has accepted the booking, and
--   * today (South African time) is the trip's departure date or later.
create or replace function public.get_booking_contact(p_booking_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  b public.bookings;
  v_other uuid;
  v_phone text;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  if auth.uid() = b.passenger_id then
    v_other := b.driver_id;
  elsif auth.uid() = b.driver_id then
    v_other := b.passenger_id;
  else
    raise exception 'This is not your booking';
  end if;

  if b.status not in ('accepted', 'disputed') then
    raise exception 'Contact details are only shared once the driver has accepted the booking';
  end if;

  if (now() at time zone 'Africa/Johannesburg')::date < b.date then
    raise exception 'Contact details unlock on the departure date';
  end if;

  select phone into v_phone from public.users where id = v_other;
  return v_phone;
end;
$$;

revoke all on function public.get_booking_contact(uuid) from public, anon;
grant execute on function public.get_booking_contact(uuid) to authenticated;

-- --------------------------------------------
-- 4. Admins can look up a phone number (for reviews and disputes)
-- --------------------------------------------
create or replace function public.admin_get_user_phone(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_phone text;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Admins only';
  end if;
  select phone into v_phone from public.users where id = p_user_id;
  return v_phone;
end;
$$;

revoke all on function public.admin_get_user_phone(uuid) from public, anon;
grant execute on function public.admin_get_user_phone(uuid) to authenticated;
