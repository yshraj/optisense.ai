/**
 * Script to set a user as premium for testing
 * Usage: node scripts/setPremiumUser.js <email>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function setPremiumUser(email) {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Set as premium with expiration date (1 year from now for testing)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    
    // Get tier from command line or default to professional
    const tier = process.argv[3] || 'professional';
    if (!['starter', 'professional'].includes(tier)) {
      console.error(`❌ Invalid tier: ${tier}. Must be 'starter' or 'professional'`);
      await mongoose.disconnect();
      process.exit(1);
    }
    
    user.isPremium = true;
    user.tier = tier;
    user.premiumExpiresAt = expirationDate;
    
    await user.save();
    
    console.log(`✅ User ${email} has been set as ${tier} tier`);
    console.log(`   - isPremium: ${user.isPremium}`);
    console.log(`   - tier: ${user.tier}`);
    console.log(`   - premiumExpiresAt: ${user.premiumExpiresAt.toLocaleString()}`);
    console.log(`\n💡 Usage: node scripts/setPremiumUser.js <email> [starter|professional]`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2] || 'yashrajmeen@gmail.com';

if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node scripts/setPremiumUser.js <email> [starter|professional]');
  process.exit(1);
}

setPremiumUser(email);

