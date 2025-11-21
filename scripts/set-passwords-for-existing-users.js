/**
 * Script to set passwords for existing users in the database
 * 
 * This script:
 * 1. Finds users in the User table without passwords in auth.users
 * 2. Creates auth.users entries if needed
 * 3. Sets passwords for existing users
 * 
 * Usage:
 *   node scripts/set-passwords-for-existing-users.js <email> <password>
 *   OR
 *   node scripts/set-passwords-for-existing-users.js --list
 *   OR
 *   node scripts/set-passwords-for-existing-users.js --all <default-password>
 * 
 * Requirements:
 *   - Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Users must already exist in the User table
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

/**
 * List all users and their auth status
 */
async function listUsers() {
  console.log('\n📋 Fetching users from database...\n');
  
  // Get all users from User table
  const { data: users, error } = await supabase
    .from('User')
    .select('id, email, displayName, username, createdAt');
  
  if (error) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Found ${users.length} user(s):\n`);
  
  for (const user of users) {
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
    
    if (authError && authError.message.includes('User not found')) {
      console.log(`❌ ${user.email}`);
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Status: No auth account`);
      console.log(`   ID: ${user.id}\n`);
    } else if (authUser?.user) {
      const hasPassword = authUser.user.encrypted_password ? '✅ Has Password' : '⚠️  No Password';
      console.log(`${hasPassword} ${user.email}`);
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Status: Auth account exists`);
      console.log(`   ID: ${user.id}\n`);
    } else {
      console.log(`❓ ${user.email}`);
      console.log(`   Status: Unknown\n`);
    }
  }
}

/**
 * Set password for a specific user by email
 */
async function setPasswordForUser(email, password) {
  console.log(`\n🔐 Setting password for ${email}...\n`);
  
  // Find user in User table
  const { data: user, error: userError } = await supabase
    .from('User')
    .select('id, email, displayName')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (userError || !user) {
    console.error(`❌ Error: User with email ${email} not found in User table`);
    return false;
  }
  
  console.log(`Found user: ${user.displayName} (${user.email})`);
  
  // Check if auth user exists
  let authUser;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(user.id);
    if (error && error.message.includes('User not found')) {
      console.log('Auth account does not exist. Creating...');
      authUser = null;
    } else if (data?.user) {
      authUser = data.user;
      console.log('Auth account exists.');
    }
  } catch (err) {
    console.log('Auth account does not exist. Creating...');
    authUser = null;
  }
  
  // Create or update auth user with password
  if (!authUser) {
    // Create new auth user
    console.log('Creating auth account...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        displayName: user.displayName,
        username: user.email.split('@')[0]
      }
    });
    
    if (createError) {
      console.error(`❌ Error creating auth user:`, createError.message);
      return false;
    }
    
    console.log(`✅ Auth account created successfully!`);
    return true;
  } else {
    // Update existing auth user password
    console.log('Updating password...');
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
    
    console.log(`✅ Password updated successfully!`);
    return true;
  }
}

/**
 * Set default password for all users without passwords
 */
async function setPasswordsForAll(defaultPassword) {
  console.log('\n📋 Finding users without passwords...\n');
  
  // Get all users
  const { data: users, error } = await supabase
    .from('User')
    .select('id, email, displayName');
  
  if (error || !users) {
    console.error('Error fetching users:', error);
    return;
  }
  
  console.log(`Found ${users.length} user(s). Checking auth status...\n`);
  
  let count = 0;
  for (const user of users) {
    // Check if auth user exists and has password
    let needsPassword = false;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
      if (!authUser?.user || !authUser.user.encrypted_password) {
        needsPassword = true;
      }
    } catch (err) {
      needsPassword = true;
    }
    
    if (needsPassword) {
      console.log(`Setting password for ${user.email}...`);
      const success = await setPasswordForUser(user.email, defaultPassword);
      if (success) {
        count++;
      }
    } else {
      console.log(`✅ ${user.email} already has a password`);
    }
  }
  
  console.log(`\n✅ Completed! Set passwords for ${count} user(s).`);
}

/**
 * Interactive mode - ask user which account to update
 */
async function interactiveMode() {
  console.log('\n🔐 Interactive Password Setup\n');
  
  await listUsers();
  
  const email = await question('\nEnter email address to set password (or "quit" to exit): ');
  
  if (email.toLowerCase() === 'quit') {
    rl.close();
    return;
  }
  
  if (!email || !email.includes('@')) {
    console.error('Invalid email address');
    rl.close();
    return;
  }
  
  const password = await question('Enter password (min 6 characters): ');
  
  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters');
    rl.close();
    return;
  }
  
  const confirm = await question(`Set password for ${email}? (yes/no): `);
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    rl.close();
    return;
  }
  
  await setPasswordForUser(email, password);
  rl.close();
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Interactive mode
    await interactiveMode();
  } else if (args[0] === '--list' || args[0] === '-l') {
    await listUsers();
    rl.close();
  } else if (args[0] === '--all' || args[0] === '-a') {
    if (!args[1]) {
      console.error('Error: Please provide a default password');
      console.log('Usage: node scripts/set-passwords-for-existing-users.js --all <password>');
      process.exit(1);
    }
    await setPasswordsForAll(args[1]);
    rl.close();
  } else if (args.length === 2) {
    // Set password for specific user: email password
    await setPasswordForUser(args[0], args[1]);
    rl.close();
  } else {
    console.log('Usage:');
    console.log('  node scripts/set-passwords-for-existing-users.js                    # Interactive mode');
    console.log('  node scripts/set-passwords-for-existing-users.js --list             # List all users');
    console.log('  node scripts/set-passwords-for-existing-users.js <email> <password> # Set password for user');
    console.log('  node scripts/set-passwords-for-existing-users.js --all <password>   # Set password for all users');
    rl.close();
  }
}

main().catch(console.error);


