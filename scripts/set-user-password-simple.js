/**
 * Simple script to set password for a single user
 * 
 * Usage:
 *   node scripts/set-user-password-simple.js <email> <password>
 * 
 * Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setPassword(email, password) {
  console.log(`\n🔐 Setting password for: ${email}\n`);
  
  // Step 1: Find user in User table
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('id, email, displayName')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (userError || !user) {
    console.error(`❌ User not found in database: ${email}`);
    console.error(`   Make sure the user exists in the User table first.`);
    return false;
  }
  
  console.log(`✅ Found user: ${user.displayName} (${user.email})`);
  console.log(`   User ID: ${user.id}\n`);
  
  // Step 2: Check if auth user exists
  let authUser;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(user.id);
    if (error) {
      if (error.message.includes('User not found')) {
        console.log('📝 Auth account does not exist. Creating new auth account...');
        authUser = null;
      } else {
        throw error;
      }
    } else {
      authUser = data.user;
      console.log('✅ Auth account exists.');
    }
  } catch (err) {
    console.error(`❌ Error checking auth user:`, err.message);
    return false;
  }
  
  // Step 3: Create or update auth user with password
  if (!authUser) {
    // Create new auth user
    console.log('🔨 Creating auth account with password...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: password,
      email_confirm: true, // Auto-confirm email so they can login immediately
      user_metadata: {
        displayName: user.displayName,
        username: user.email.split('@')[0]
      }
    });
    
    if (createError) {
      console.error(`❌ Error creating auth user:`, createError.message);
      return false;
    }
    
    console.log(`✅ Success! Auth account created and password set.`);
    console.log(`   User can now login with email: ${user.email}`);
    return true;
  } else {
    // Update existing auth user password
    console.log('🔨 Updating password...');
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        password: password,
        email_confirm: true // Ensure email is confirmed
      }
    );
    
    if (updateError) {
      console.error(`❌ Error updating password:`, updateError.message);
      return false;
    }
    
    console.log(`✅ Success! Password updated.`);
    console.log(`   User can now login with email: ${user.email}`);
    return true;
  }
}

// Main
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage:');
  console.log('  node scripts/set-user-password-simple.js <email> <password>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/set-user-password-simple.js user@example.com MyPassword123');
  console.log('');
  console.log('Note: User must already exist in the User table.');
  process.exit(1);
}

const [email, password] = args;

if (!email || !email.includes('@')) {
  console.error('❌ Invalid email address');
  process.exit(1);
}

if (!password || password.length < 6) {
  console.error('❌ Password must be at least 6 characters');
  process.exit(1);
}

setPassword(email, password)
  .then((success) => {
    if (success) {
      console.log('\n✅ Done!');
      process.exit(0);
    } else {
      console.log('\n❌ Failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });


