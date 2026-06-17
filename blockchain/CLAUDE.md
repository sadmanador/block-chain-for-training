# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:3000
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
npm run reset-db     # Reset DB, balances, and blockchain file (requires .env.local)
npx ts-node scripts/seed-users.ts  # Seed demo users (alice, bob, admin)
```

There are no automated tests. Manual tampering detection testing is described in README.md.

## Environment Setup

Requires `.env.local` with:
```
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
```

## Architecture

This is a **Next.js 16 App Router** project (TypeScript + Tailwind CSS) that teaches blockchain concepts via a virtual money transfer system with tamper detection.

### Dual Storage Design

Every transaction writes to **two independent stores**:

1. **`data/blockchain.json`** — the immutable source of truth. A SHA-256 hash chain managed by the `LocalBlockchain` singleton in `lib/localBlockchain.ts`. The file is read/written directly via the filesystem; no database involved.

2. **MongoDB** (Mongoose) — stores `User`, `Transaction`, and `Block` documents for fast querying and balance tracking. It mirrors blockchain data but can be tampered with independently, which is the whole point.

Cross-reference verification at read time compares MongoDB transaction amounts against the corresponding blockchain block entries. Mismatches surface as tampered records in the UI.

### Auth & RBAC

NextAuth.js v5 (beta) with credentials provider. JWT sessions. Two roles: `user` and `admin`. Route protection is in `middleware.ts`:
- `/dashboard/*` — `user` role only
- `/admin/*` and `/api/admin/*` — `admin` role only

Session data is extended in `types/next-auth.d.ts` to include `id`, `username`, and `role`.

### Key Files

| File | Purpose |
|------|---------|
| `lib/localBlockchain.ts` | `LocalBlockchain` singleton: reads/writes `data/blockchain.json`, hashing, tamper detection |
| `lib/blockchain.ts` | MongoDB-backed block helpers (`createBlock`, `validateChain`) — less central than localBlockchain |
| `lib/auth.ts` | NextAuth config (credentials provider, JWT callbacks) |
| `lib/db.ts` | Mongoose connection singleton |
| `middleware.ts` | JWT-based route protection and role redirects |
| `app/api/transactions/route.ts` | Core transfer flow: validate → write to local blockchain → write to MongoDB → update balances |
| `app/api/admin/revert/route.ts` | Admin revert: restores MongoDB from blockchain, creates audit trail |
| `app/api/blockchain/tamper/route.ts` | Demo endpoint: mutates `blockchain.json` without recalculating hash |

### Transaction Flow

```
POST /api/transactions
  → validate session, recipient, balance
  → localBlockchain.addBlock(txData)   ← writes data/blockchain.json
  → Transaction.create(...)            ← writes MongoDB
  → User.updateOne balances            ← writes MongoDB
```

### Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| alice | password123 | user |
| bob | password123 | user |
| admin | admin123 | admin |

After `reset-db`, balances are Alice: 5000 VC, Bob: 5000 VC, Admin: 0 VC.
