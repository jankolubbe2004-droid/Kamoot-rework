# RoamFree

Outdoor navigation app (hiking, cycling, trail running) that competes with Komoot by offering truly free core features.

## What's free, forever

- Unlimited route planning
- GPX export — no paywall, ever
- Device sync (Garmin, Wahoo via .fit export)
- Full sensor support (HR, cadence, power)
- Community route discovery

## Pricing

| Plan | Price | What's extra |
|------|-------|-------------|
| Free | $0 | Everything above |
| Explorer | $1.99/mo | Offline maps, advanced analytics |
| Lifetime | $29 one-time | Explorer features, forever |

## Tech Stack

- **Frontend**: React Native (Expo) + Expo Router + MapLibre GL (OpenStreetMap)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Routing**: GraphHopper (self-hosted)
- **Payments**: Stripe

## Project Structure

```
roamfree/
├── apps/mobile/          # Expo React Native app
├── packages/shared/      # Shared TypeScript types
└── supabase/             # Migrations, edge functions, seed data
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Yarn ≥ 1.22
- Expo CLI: `npm i -g expo-cli`
- Supabase CLI (for local dev): `npm i -g supabase`

### Setup

```bash
# Install dependencies
yarn install

# Copy env template
cp apps/mobile/.env.example apps/mobile/.env.local

# Fill in your Supabase and GraphHopper URLs in .env.local

# Run Supabase migrations
supabase db reset

# Start the app
yarn mobile
```

### Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=         # Your Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
EXPO_PUBLIC_MAPLIBRE_STYLE_URL=   # Map style (default: OpenFreeMap liberty)
EXPO_PUBLIC_GRAPHHOPPER_URL=      # GraphHopper instance URL
```

## Development Phases

- **Phase 1 (MVP)** ✅ — Auth, map, route planning, GPX export, route discovery
- **Phase 2** — Activity recording, BLE sensors, route photos
- **Phase 3** — Stripe payments, offline maps, Garmin/Wahoo sync

## Architecture Notes

- All tables have Row Level Security (RLS) enabled
- Users own their data — bulk GPX export always available
- No Google Maps — MapLibre + OpenStreetMap only
- Supabase Auth handles all authentication
