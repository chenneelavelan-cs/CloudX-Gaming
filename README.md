# CloudX Gaming

Production-ready web application for **CloudX Gaming** center in Sholinganallur.

## Stack

- **Frontend:** Angular 19 + Tailwind CSS (mobile-first dark theme)
- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB

## Prerequisites

- Node.js 20+
- MongoDB running locally (or update `MONGODB_URI` in `server/.env`)

## Quick Start

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Configure environment
cp server/.env.example server/.env   # edit if needed

# 3. Seed database with initial data
cd server && npm run seed

# 4. Start backend (port 3000)
npm run dev

# 5. Start frontend (port 4200) — in another terminal
cd ../client && npm start
```

## Default Admin Login

| Field    | Value                    |
|----------|--------------------------|
| Email    | admin@cloudxgaming.com   |
| Password | admin123                 |

## URLs

| Route              | Description                |
|--------------------|----------------------------|
| `/`                | Customer-facing home       |
| `/book`            | Customer booking           |
| `/admin/login`     | Staff login                |
| `/admin/dashboard` | Active sessions + quick actions |

## Architecture Highlights

- **Decoupled workflows:** Booking, Gaming Entry, and Billing are independent
- **Pricing engine:** Duration-tier based with player-count support; recalculates on session extension
- **Mobile-first admin:** Bottom nav, large touch targets, session timers with urgency indicators
- **Structured billing:** Typed bill items (gaming, product, combo, custom) for analytics

## Project Structure

```
CloudX-Gaming/
├── client/          # Angular frontend
├── server/          # Node.js API
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── modules/         # Route handlers
│   │   ├── services/        # Pricing engine, availability
│   │   └── scripts/seed.ts  # Initial data seeder
└── README.md
```

## API

Base URL: `http://localhost:3000/api/v1`

Key endpoints:
- `POST /auth/login` — Admin authentication
- `GET /gaming-entries?status=active` — Active sessions
- `POST /gaming-entries/:id/extend` — Extend session
- `POST /pricing/calculate` — Price calculation
- `POST /bills` — Create bill
- `POST /bills/:id/pay` — Record payment

## Development

```bash
# Run pricing engine tests
cd server && npm test

# Build for production
cd server && npm run build
cd client && npm run build
```

## Seeded Data

The seed script creates:
- 6 gaming options (PS5, PS2, PC RTX 4060/3060, VR, Driving)
- 12 physical resources (TVs, PS5s, PCs)
- PS5 player-based pricing tiers
- PC and VR pricing tiers
- 6 products (Fries, Nuggets, Coke, etc.)
- PC Member membership plan (10% PC discount)
