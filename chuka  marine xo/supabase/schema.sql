-- Supabase PostgreSQL schema for CHROME XO. Used only by the Rust API (service role key stays server-side).
create extension if not exists pgcrypto;
create table events(id text primary key, name text not null, venue text not null, starts_at timestamptz, capacity int);
create type res_status as enum('RESERVED','PAYMENT_PENDING','EXPIRED','CONVERTED','RELEASED');
create table reservations(id uuid primary key default gen_random_uuid(), event_id text references events, qty int check(qty between 1 and 10), total_kes int not null,
  status res_status not null default 'RESERVED', expires_at timestamptz not null, created_at timestamptz default now());
create table orders(id uuid primary key default gen_random_uuid(), reservation_id uuid unique references reservations, buyer_name text, buyer_phone text, total_kes int not null, status text not null default 'AWAITING_PAYMENT', created_at timestamptz default now());
create table payment_submissions(id uuid primary key default gen_random_uuid(), order_id uuid references orders, message_hash text unique, mpesa_ref text unique, status text not null default 'VERIFICATION_PENDING', created_at timestamptz default now());
create table tickets(id text primary key, event_id text references events, order_id uuid references orders, holder_name text not null, holder_phone text not null, category text not null,
  status text not null default 'VALID', qr_token text unique not null, issued_at timestamptz default now(), used_at timestamptz);
-- Ticket ids (e.g. OML-7F3A-92KD-X81P) are generated in Rust from a CSPRNG; the primary key enforces uniqueness.
alter table tickets enable row level security; alter table orders enable row level security; alter table payment_submissions enable row level security; alter table reservations enable row level security;
