# Database Setup Instructions

## Prerequisites
- Supabase account with a project created
- `.env.local` file with Supabase credentials

## Step 1: Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `/database/schema.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click **Run** to execute the schema creation

This will create all the necessary tables, indexes, and functions for the Ritual Prediction Market.

## Step 2: Seed the Database

After creating the schema, run the seed script to populate initial data:

```bash
npm run seed
```

This will create:
- **Admin account**: `username: admin`, `password: admin123`
- **5 test member accounts**: `alice`, `bob`, `charlie`, `diana`, `eve` (all with password: `password123`)
- **Platform settings** with default values

## Step 3: Verify Setup

1. Go back to Supabase dashboard
2. Navigate to **Table Editor**
3. Check the `users` table - you should see 6 users (1 admin + 5 members)
4. Check the `platform_settings` table for configuration values

## Security Notes

⚠️ **Important**: After first login, immediately change the admin password!

The seed script creates accounts with default passwords for development purposes only. In production:
- Use strong, unique passwords
- Enable row-level security (RLS) in Supabase
- Implement proper authentication middleware

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Ensure `.env.local` exists in the project root
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

### Error: "User already exists"
- The seed script can be run multiple times safely
- Existing users will be skipped with a warning message

### Error: "Permission denied"
- Check your Supabase project's API settings
- Ensure the anon key has necessary permissions
- You may need to disable RLS temporarily for seeding

## Next Steps

After database setup is complete:
1. Start the development server: `npm run dev`
2. Log in with admin credentials
3. Begin testing the application features
