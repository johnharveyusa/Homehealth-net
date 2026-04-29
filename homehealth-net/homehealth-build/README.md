# Bloodhound Home Health

Next.js 16 / TypeScript / Tailwind 4 / Supabase / Stripe

## Stack
- **Next.js 16** — App Router
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** — auth + database
- **Stripe** — subscription billing
- **Vercel** — deployment

## Routes
| Route | Description |
|---|---|
| `/` | Redirects to `/login` |
| `/login` | PIN keypad — 4-digit nurse login |
| `/dashboard` | My Clients accordion — today's visit roster |

## Environment Variables
Create `.env.local` in the project root (never commit this file):
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Supabase Schema (next sprint)
```sql
-- Agencies (billing entity)
create table agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'business',
  seat_count int default 1,
  active boolean default true,
  created_at timestamptz default now()
);

-- Nurses
create table nurses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id),
  name text not null,
  role text,
  territory text,
  pin text not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Clients
create table clients (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references agencies(id),
  nurse_id uuid references nurses(id),
  first_name text,
  last_name text,
  dob date,
  address text,
  gate_code text,
  parking text,
  hazards text,
  care_types text[],
  active boolean default true
);
```

## Getting Started
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Demo PINs (prototype only)
- Taylor Smith (Nurse): `1234`
- Jordan Lee (Therapist): `5678`
- Marcus Webb (Nurse): `9012`

## Pricing
| Plan | Price |
|---|---|
| Solo | $4.99/mo |
| Family | $9.99/mo (5 users) |
| Business | $12/seat/mo |
| Home Zone | Free |
