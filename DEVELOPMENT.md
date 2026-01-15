# Ritual Prediction Market - Setup & Running Guide

## Current Implementation Status

### ✅ Completed - Phase 1
- Next.js 16 project with App Router
- Tailwind CSS with custom emerald-green theme
- Supabase integration
- Authentication system (username/password)
- Database schema (SQL migrations)
- Seed script for creating admin and test users
- Login and Register pages with beautiful UI
- Protected routes and auth context
- Navigation component

## Getting Started

### 1. Database Setup

First, set up your Supabase database:

```bash
# Go to Supabase dashboard > SQL Editor
# Copy and paste the contents of /database/schema.sql
# Run the SQL to create all tables and functions
```

### 2. Seed the Database

```bash
npm run seed
```

This creates:
- Admin: `username: admin`, `password: admin123`
- Test users: alice, bob, charlie, diana, eve (all password: `password123`)

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Project Structure

```
ritual-pm/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js       # Login API
│   │   │   └── register/route.js    # Registration API
│   │   └── users/[id]/route.js      # User details API
│   ├── login/page.js                # Login page
│   ├── register/page.js             # Register page
│   ├── page.js                      # Home/Dashboard
│   ├── layout.js                    # Root layout
│   └── globals.css                  # Global styles + theme
├── components/
│   └── Navigation.js                # Main navigation bar
├── contexts/
│   └── AuthContext.js               # Authentication context
├── database/
│   ├── schema.sql                   # Database schema
│   ├── seed.sql                     # SQL seed data
│   └── README.md                    # Database setup guide
├── lib/
│   └── supabase.js                  # Supabase client
├── scripts/
│   └── seed.js                      # Node seed script
└── .env.local                       # Environment variables
```

## Design System

### Colors
- **Primary**: Emerald Green (#10B981)
- **Secondary**: Blue (#3B82F6)
- **Accent**: Lime (#84CC16)
- **Alert**: Coral (#F43F5E)
- **Warning**: Orange (#F59E0B)

### Components
- Glassmorphism effects
- Medium 3D shadows
- Smooth transitions
- Emerald gradient buttons

## Next Implementation Phases

### Phase 2 - Markets (Next)
- [ ] Market creation form
- [ ] Market listing/grid view
- [ ] Market detail page
- [ ] Market approval voting
- [ ] Market status management

### Phase 3 - Predictions
- [ ] Prediction placement form
- [ ] User predictions history
- [ ] Real-time pool updates
- [ ] Prediction calculations

### Phase 4 - Resolution
- [ ] Admin resolution interface
- [ ] Community voting resolution
- [ ] Payout calculations
- [ ] Dispute system

### Phase 5 - Admin Dashboard
- [ ] Admin panel
- [ ] User management
- [ ] Market management
- [ ] Activity logs
- [ ] Platform settings

## Testing Accounts

After running seed:
- **Admin**: `admin` / `admin123`
- **Members**: `alice`, `bob`, `charlie`, `diana`, `eve` / `password123`

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database connection issues
- Verify .env.local has correct Supabase credentials
- Check Supabase dashboard for project status
- Ensure schema.sql has been executed

### Seed script errors
- Make sure schema.sql was run first
- Check Supabase RLS policies aren't blocking inserts
- Verify environment variables are loaded

## Development Tips

1. **Hot Reload**: Changes to pages and components reload automatically
2. **API Routes**: Located in `app/api/` - use for server-side logic
3. **Auth Check**: Use `useAuth()` hook to check authentication status
4. **Protected Routes**: Wrap pages with auth check as shown in `page.js`

## Next Steps

Ready to implement markets! Let me know when you're ready for Phase 2.
