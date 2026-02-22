# Blockchain Money Transfer System

A full-stack Next.js application demonstrating blockchain-based virtual money transfers in a classroom setting. The system features authentication with role-based access control, a blockchain ledger, and differentiated dashboards for users and admins.

## 🆚 Comparison: With vs Without Blockchain

This project includes **TWO versions** for side-by-side comparison:

### 1. **Blockchain Version** (This Folder - Port 3000)
✅ Immutable transactions  
✅ Tamper detection  
✅ Cross-reference verification  
✅ Admin revert capability  

### 2. **Non-Blockchain Version** (`/nonblockchain` folder - Port 3001)
❌ No tamper detection  
❌ No immutability  
❌ Silent data corruption  
❌ No way to detect modifications  

**See [COMPARISON.md](COMPARISON.md) for detailed side-by-side testing!**

### Quick Comparison Test
```bash
# Terminal 1: Run blockchain version
npm run dev

# Terminal 2: Run non-blockchain version
cd nonblockchain && npm run dev

# Open both:
# http://localhost:3000 (with blockchain)
# http://localhost:3001 (without blockchain)
```

## Features

- **Authentication & RBAC**: NextAuth.js with credentials provider (2 standard users + 1 admin)
- **Local Blockchain**: SHA-256 hash-based blockchain stored in `data/blockchain.json` (independent of database)
- **Tamper Detection**: Real-time validation that detects any changes to the blockchain
- **Cross-Reference Verification**: Compares MongoDB data with blockchain to detect tampering
- **Visual Tampering Alerts**: Highlights tampered transactions in red with before/after amounts
- **Database User Detection**: Exposes which database user made unauthorized changes
- **Admin Revert System**: Allows admin to restore original values from blockchain with confirmation modal
- **Audit Trail**: Tracks all reverts with timestamps and admin signatures
- **Money Transfers**: Secure transfers between users with balance validation
- **Differentiated Dashboards**:
  - **User Dashboard**: View balance, transfer funds, transaction history, chain validator
  - **Admin Dashboard**: Full blockchain ledger with block metadata, chain validation
- **Dark Theme**: Modern UI with Tailwind CSS

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend & Backend | Next.js 16 (App Router) |
| Authentication | NextAuth.js v5 (beta) |
| Database | MongoDB Atlas with Mongoose (for queries) |
| Blockchain | Local JSON file (data/blockchain.json) |
| Styling | Tailwind CSS |
| Language | TypeScript |

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB instance)

### 1. Environment Setup

Update `.env.local` with your configuration:

```env
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/blockchain-transfer?retryWrites=true&w=majority
```

**Important**: Replace `MONGODB_URI` with your actual MongoDB connection string.

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed the Database

Run the seed script to create demo users and the genesis block:

```bash
npx ts-node scripts/seed-users.ts
```

This creates:
- **alice** (user) - password: `password123` - balance: 1000 VC
- **bob** (user) - password: `password123` - balance: 1000 VC
- **admin** (admin) - password: `admin123` - balance: 0 VC

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### User Flow

1. Login with alice or bob credentials
2. View current balance on the dashboard
3. Transfer funds to the other user
4. View transaction history

### Admin Flow

1. Login with admin credentials
2. View the full blockchain ledger
3. See block metadata (hashes, timestamps, transactions)
4. Check chain integrity status
5. View all user balances

## Project Structure

```
block-chain/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth.js handlers
│   │   ├── transactions/         # Transaction API
│   │   ├── admin/ledger/         # Admin ledger API
│   │   └── users/                # Users API
│   ├── login/                    # Login page
│   ├── dashboard/                # User dashboard
│   ├── admin/                    # Admin dashboard
│   └── page.tsx                  # Home (redirects to login)
├── components/                   # React components
│   ├── BalanceCard.tsx
│   ├── TransferForm.tsx
│   ├── TransactionHistory.tsx
│   ├── BlockchainLedger.tsx
│   ├── BlockCard.tsx
│   ├── Navbar.tsx
│   └── SessionProvider.tsx
├── data/                         # Local blockchain storage
│   └── blockchain.json           # Blockchain file (immutable)
├── lib/                          # Utility functions
│   ├── auth.ts                   # NextAuth config
│   ├── db.ts                     # MongoDB connection
│   ├── blockchain.ts             # Block hashing logic
│   └── localBlockchain.ts        # Local blockchain manager
├── models/                       # Mongoose schemas
│   ├── User.ts
│   ├── Transaction.ts
│   └── Block.ts
├── scripts/                      # Setup scripts
│   └── seed-users.ts
├── types/                        # TypeScript types
│   ├── index.ts
│   └── next-auth.d.ts
└── planning/                     # Original planning docs
```

## API Endpoints

### Authentication
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js handlers

### Transactions
- `GET /api/transactions` - Get user's transaction history
- `POST /api/transactions` - Create a new transfer
  - Body: `{ receiverId: string, amount: number }`
- `GET /api/transactions/balance` - Get current user balance

### Admin
- `GET /api/admin/ledger` - Get full blockchain ledger (admin only)

### Blockchain
- `GET /api/blockchain/local` - Get local blockchain data
- `GET /api/blockchain/verify` - Verify blockchain integrity
- `POST /api/blockchain/tamper` - Simulate tampering (demo only)

### Users
- `GET /api/users` - Get list of users for transfers

## How It Works

### Dual Storage Architecture

The system uses **two storage systems**:

1. **Local Blockchain File** (`data/blockchain.json`)
   - **Source of truth** for all transactions
   - Immutable SHA-256 hash chain
   - Independent of the database
   - Tamper-evident by design

2. **MongoDB Database**
   - Stores user data and balances
   - Stores transaction records for fast querying
   - Mirrors blockchain data for display purposes

### Transaction Flow

1. User submits transfer request
2. Server validates authentication, recipient, amount, and balance
3. **Add block to LOCAL BLOCKCHAIN** (data/blockchain.json)
   - Creates new block with transaction data
   - Calculates SHA-256 hash
   - Links to previous block
4. Save transaction to MongoDB (for querying)
5. Update user balances in MongoDB
6. Return success response

### Blockchain Validation

Each block contains:
- **index**: Block number in the chain
- **timestamp**: When the block was created
- **transactions**: JSON array of transaction data
- **previousHash**: Hash of the previous block
- **hash**: SHA-256 hash of this block's data
- **nonce**: For demonstration (set to 0)

**Tamper Detection:**
1. Recalculate hash from block data
2. Compare with stored hash
3. If different → **TAMPERING DETECTED!**
4. Check chain links between blocks
5. Visual alert shown on dashboard

### Cross-Reference Tamper Detection

The system performs **automatic cross-reference verification** between MongoDB and the local blockchain:

**How it works:**
1. When fetching transaction history, the system compares each database record with its corresponding blockchain entry
2. If amounts or other fields don't match → transaction is marked as **TAMPERED**
3. User sees:
   - Red alert banner: "⚠️ DATA TAMPERING DETECTED!"
   - Transaction highlighted in red with strikethrough on the modified amount
   - Original amount from blockchain shown in green with ✓
4. Admin sees:
   - Critical warning on dashboard
   - Tampered blocks highlighted with red borders
   - Count of tampered transactions
   - Detailed comparison: Database vs Blockchain amounts

**This proves:** Even if someone hacks the database directly, the blockchain (stored in a separate file) maintains the true record, and the tampering is immediately visible to all users!

## Demo Credentials

| Username | Password | Role | Balance |
|----------|----------|------|---------|
| alice | password123 | user | 1000 VC |
| bob | password123 | user | 1000 VC |
| admin | admin123 | admin | 0 VC |

## Development

### Build for Production

```bash
npm run build
```

### Run Production Build

```bash
npm start
```

### Reset Database

To reset the database and start fresh:

```bash
npx ts-node scripts/seed-users.ts
```

### Test Tampering Detection

#### Method 1: Blockchain File Tampering

1. Make a transaction between users
2. On your dashboard, click **"Test Tamper"** button
3. Enter a block index (e.g., 1) and new amount (e.g., 9999)
4. Within 5 seconds, the dashboard will show **"TAMPERING DETECTED!"**
5. The blockchain validator will show exactly which block was tampered

**To manually tamper the blockchain:**
```bash
# Edit the blockchain file
open data/blockchain.json

# Change any transaction amount
# Save the file
# Watch the dashboard detect the tampering!
```

#### Method 2: Database Tampering (Cross-Reference Detection)

1. Make a transaction (e.g., Alice sends 100 VC to Bob)
2. Go to MongoDB Atlas or Compass
3. Find the `transactions` collection
4. Locate the transaction you just made
5. Change the `amount` field from 100 to 9999
6. **Save the change**
7. Refresh your dashboard
8. **Result:** You'll see:
   - Red alert: "⚠️ DATA TAMPERING DETECTED!"
   - The transaction highlighted in red
   - Strikethrough on "9999 VC" (the fake amount)
   - Green text showing "100 VC ✓" (the real amount from blockchain)

9. **Login as admin** - you'll see:
   - Critical warning banner at the top
   - The block highlighted with red border
   - Detailed comparison showing the discrepancy
   - **Database username** exposed (from MongoDB connection string)

#### Method 3: Admin Revert Process

When tampering is detected, the admin can restore the original values:

1. **Login as admin** and view the tampered block
2. Click the **"Revert"** button on the tampered transaction
3. A modal will appear showing:
   - Transaction details (sender, receiver, amounts)
   - Database amount (tampered value)
   - Blockchain amount (original correct value)
   - **Database user** who made the change (extracted from MongoDB URI)
4. Click **"Revert to Blockchain"** to confirm
5. The system will:
   - Restore the original amount from blockchain
   - Adjust user balances accordingly
   - Mark the transaction as "reverted"
   - Create an audit trail with timestamp and admin name

**Result:** Users see the corrected transaction marked as "Reverted" with full audit history.

**This demonstrates that even with direct database access, the blockchain file remains the immutable source of truth, and the admin can always restore integrity!**
```

## Security Notes

### Blockchain Security

- **Immutable Storage**: Blockchain stored in local file, separate from database
- **Cryptographic Hashes**: SHA-256 ensures any change breaks the chain
- **Tamper Detection**: Automatic validation detects modifications within seconds
- **Independent Verification**: Can verify integrity without database access

### Application Security

- Passwords are hashed with bcrypt (12 salt rounds)
- Sessions use JWT strategy with secure cookies
- Route protection via NextAuth middleware
- Role-based access control on API routes
- Input validation on all API endpoints

## Future Enhancements

- [x] ~~Add Hyperledger Fabric integration~~ ✅ Local blockchain implemented
- [ ] Real-time updates with WebSockets
- [ ] Transaction signing with digital signatures
- [ ] Export transaction history
- [ ] Multi-currency support
- [ ] Smart contract validation rules
- [ ] Blockchain explorer with search

## License

MIT
