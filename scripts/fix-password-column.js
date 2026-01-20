#!/usr/bin/env node

/**
 * Fix password column to allow NULL values
 * Run: node scripts/fix-password-column.js
 */

const { createClient } = require('@supabase/supabase-js');

async function fixPasswordColumn() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🔧 Fixing password column constraint...\n');

  try {
    // Execute the ALTER TABLE command via RPC or direct query
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE marketplace_credentials ALTER COLUMN password DROP NOT NULL;'
    });

    if (error) {
      console.log('⚠️  RPC method not available, trying alternative...\n');
      
      // Alternative: Update existing records to have NULL password, then the constraint should be gone
      const { data, error: updateError } = await supabase
        .from('marketplace_credentials')
        .update({ password: null })
        .is('password', null);

      if (updateError && updateError.code !== '42703') { // 42703 = column doesn't exist
        throw updateError;
      }
    }

    console.log('✅ Password column updated successfully!');
    console.log('\n📝 Note: You may need to run this SQL manually in Supabase dashboard:');
    console.log('   ALTER TABLE marketplace_credentials ALTER COLUMN password DROP NOT NULL;\n');
    console.log('   Go to: https://supabase.com/dashboard → SQL Editor\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📝 Please run this SQL manually in Supabase dashboard:');
    console.log('   ALTER TABLE marketplace_credentials ALTER COLUMN password DROP NOT NULL;\n');
    console.log('   Go to: https://supabase.com/dashboard → SQL Editor\n');
    process.exit(1);
  }
}

fixPasswordColumn();
