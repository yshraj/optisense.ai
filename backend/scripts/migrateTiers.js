/**
 * Migration Script: Migrate existing premium users to new tier system
 * 
 * This script migrates users with isPremium: true to tier: 'professional'
 * Run this once before deploying the new tier system
 * 
 * Usage: node scripts/migrateTiers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function migrateTiers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with isPremium: true and tier: 'free' or 'premium'
    const premiumUsers = await User.find({
      $or: [
        { isPremium: true },
        { tier: 'premium' }
      ]
    });

    console.log(`\n📊 Found ${premiumUsers.length} premium users to migrate`);

    if (premiumUsers.length === 0) {
      console.log('✅ No users to migrate');
      await mongoose.disconnect();
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const user of premiumUsers) {
      // Skip if already on professional tier
      if (user.tier === 'professional') {
        console.log(`⏭️  Skipping ${user.email} - already on professional tier`);
        skipped++;
        continue;
      }

      // Migrate to professional tier
      user.tier = 'professional';
      // Keep isPremium flag for backward compatibility
      user.isPremium = true;
      
      await user.save();
      console.log(`✅ Migrated ${user.email} to professional tier`);
      migrated++;
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total: ${premiumUsers.length}`);

    // Also update any users with tier: 'enterprise' to 'professional' (since we're not supporting enterprise yet)
    const enterpriseUsers = await User.find({ tier: 'enterprise' });
    if (enterpriseUsers.length > 0) {
      console.log(`\n⚠️  Found ${enterpriseUsers.length} users with 'enterprise' tier`);
      console.log('   Migrating them to professional tier...');
      
      for (const user of enterpriseUsers) {
        user.tier = 'professional';
        await user.save();
        console.log(`✅ Migrated ${user.email} from enterprise to professional tier`);
      }
    }

    console.log('\n✅ Migration completed successfully');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrateTiers();

