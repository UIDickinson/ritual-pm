# Ritual Prediction Market

A decentralized prediction market platform for the Ritual Network community, built with Next.js and Supabase.

## Features

### Core Functionality
- **User Authentication**: Secure username/password authentication system
- **Market Creation**: Create prediction markets with 2-5 possible outcomes
- **Community Approval**: Markets require community votes before going live
- **Prediction Trading**: Place predictions on market outcomes with a 1% platform fee
- **Market Resolution**: Admin-managed resolution with automatic payout distribution
- **Dispute System**: 24-hour window to dispute resolutions with admin review

### User Features
- Dashboard with live, proposed, and closed markets
- Search and filter markets by keywords
- Personal prediction history with performance stats
- Real-time balance tracking
- Market detail pages with outcome percentages

### Admin Features
- Comprehensive admin dashboard with statistics
- Market status management (activate, close, dissolve)
- User management (balance adjustment, role changes)
- Dispute resolution (uphold, overturn, invalidate)
- Platform settings configuration
- Activity logs and analytics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4 with custom emerald-green theme
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Custom bcrypt-based system
- **Icons**: Lucide React

## Installation

1. Clone the repository:
```bash
git clone https://github.com/UIDickinson/ritual-pm.git
cd ritual-pm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
- Run the SQL schema from `database/schema.sql` in your Supabase project
- This creates all necessary tables, functions, and triggers

5. Seed the database (optional):
```bash
node scripts/seed.js
```
This creates:
- Admin user (username: `admin`, password: `admin123`)
- 5 test users (alice, bob, charlie, diana, eve - password: `password123`)

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Usage

### For Users

1. **Register/Login**: Create an account or login with existing credentials
2. **Browse Markets**: View live, proposed, and closed markets on the dashboard
3. **Vote on Proposals**: Approve or reject proposed markets (requires 10 votes)
4. **Place Predictions**: Stake points on outcomes you believe will happen
5. **Track Performance**: View your prediction history and statistics
6. **Dispute Resolutions**: Challenge incorrect resolutions within 24 hours

### For Admins

1. **Access Admin Dashboard**: Click "Admin" in the navigation (admin only)
2. **Manage Markets**:
   - Activate approved markets to make them live
   - Close live markets when time expires
   - Dissolve inappropriate proposed markets
3. **Resolve Markets**:
   - Select winning outcomes
   - Automatic payout distribution
4. **Handle Disputes**:
   - Review dispute reasoning
   - Uphold, overturn, or invalidate resolutions
5. **Manage Users**:
   - Adjust user balances
   - Change user roles (admin/member/viewer)
6. **Configure Platform**:
   - Set approval vote requirements
   - Adjust time windows
   - Modify platform fee percentage

## Security

- Passwords hashed with bcrypt (10 rounds)
- Admin-only routes protected with role validation
- SQL injection prevention via Supabase parameterized queries
- Activity logging for audit trails

## Market Lifecycle

1. **Proposed** → Community voting (15 hours, 10 votes required)
2. **Approved** → Awaiting admin activation
3. **Live** → Active trading until close time
4. **Closed** → Trading ended, awaiting resolution
5. **Resolved** → Winner selected, 24-hour dispute window
6. **Disputed** → Under admin review (if disputed)
7. **Final** → Completed, payouts distributed

## Contributing

This is a community project for Ritual Network. Contributions are highly welcome!


## Links

- [Ritual Network](https://ritual.net)


---

Built with ❤️ for the Ritual Network community