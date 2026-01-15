#!/usr/bin/env node

/**
 * Database Seeding Script for Ritual Prediction Market
 * 
 * Usage: node scripts/seed.js
 * 
 * This script will:
 * 1. Create an admin user (username: admin, password: admin123)
 * 2. Create sample member users
 * 3. Insert platform settings
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Create Admin User
    console.log('👤 Creating admin user...');
    const adminPasswordHash = await hashPassword('admin123');
    
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert([
        {
          username: 'admin',
          password_hash: adminPasswordHash,
          role: 'admin',
          points_balance: 10000
        }
      ])
      .select()
      .single();

    if (adminError) {
      if (adminError.code === '23505') {
        console.log('⚠️  Admin user already exists');
      } else {
        throw adminError;
      }
    } else {
      console.log('✅ Admin user created successfully');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Balance: 10000 points\n');
    }

    // 2. Create Sample Member Users
    console.log('👥 Creating sample member users...');
    const memberUsers = [
      { username: 'alice', password: 'password123', balance: 100 },
      { username: 'bob', password: 'password123', balance: 100 },
      { username: 'charlie', password: 'password123', balance: 100 },
      { username: 'diana', password: 'password123', balance: 100 },
      { username: 'eve', password: 'password123', balance: 100 }
    ];

    for (const member of memberUsers) {
      const passwordHash = await hashPassword(member.password);
      
      const { error } = await supabase
        .from('users')
        .insert([
          {
            username: member.username,
            password_hash: passwordHash,
            role: 'member',
            points_balance: member.balance
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          console.log(`   ⚠️  User ${member.username} already exists`);
        } else {
          throw error;
        }
      } else {
        console.log(`   ✅ Created user: ${member.username} (password: ${member.password})`);
      }
    }

    console.log('');

    // 3. Insert Platform Settings
    console.log('⚙️  Configuring platform settings...');
    const settings = [
      { key: 'min_approval_votes', value: { number: 10 } },
      { key: 'approval_window_hours', value: { number: 15 } },
      { key: 'dispute_window_hours', value: { number: 24 } },
      { key: 'stake_fee_percentage', value: { number: 1 } },
      { key: 'starting_balance', value: { number: 10 } },
      { key: 'min_stake_amount', value: { number: 1 } }
    ];

    for (const setting of settings) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert([setting], { onConflict: 'key' });

      if (error) throw error;
    }

    console.log('✅ Platform settings configured\n');

    // Summary
    console.log('🎉 Database seeding completed successfully!\n');
    console.log('📝 Summary:');
    console.log('   - Admin account ready (username: admin, password: admin123)');
    console.log('   - 5 member accounts created (password: password123)');
    console.log('   - Platform settings configured');
    console.log('\n💡 You can now log in and start using the application!');
    console.log('\n🔐 Security Note: Change the admin password after first login!\n');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
