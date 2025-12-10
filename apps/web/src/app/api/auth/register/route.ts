import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, surname, avatarUrl } = body;

    if (!email || !password || !firstName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, and firstName are required' },
        { status: 400 }
      );
    }

    let supabaseAdmin;
    try {
      // Check if service role key is configured
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
        return NextResponse.json(
          { 
            error: 'Server configuration error', 
            details: 'Service role key is not configured. Please set SUPABASE_SERVICE_ROLE_KEY in your environment variables.',
            hint: 'This is required for server-side user creation.'
          },
          { status: 500 }
        );
      }
      
      supabaseAdmin = getSupabaseServerClient();
      console.log('Supabase admin client created successfully');
    } catch (supabaseError: any) {
      console.error('Error creating Supabase admin client:', supabaseError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize Supabase client', 
          details: supabaseError?.message || 'Unknown error',
          hint: 'Please check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
        },
        { status: 500 }
      );
    }

    // Create user in auth.users using admin API
    console.log('Attempting to create user in auth.users:', { email: email.trim().toLowerCase() });
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        Firstname: firstName.trim(),
        Surname: surname?.trim() || '',
        avatarUrl: avatarUrl || null,
      },
    });

    if (authError) {
      console.error('Error creating user in auth.users:', authError);
      console.error('Auth error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        name: authError.name,
      });
      
      // Check if user already exists
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        return NextResponse.json(
          { error: 'User already exists', details: 'An account with this email already exists. Please try logging in instead.' },
          { status: 409 }
        );
      }
      
      // If it's a database error, check if the user was actually created in auth.users
      // The trigger might have failed but the user might still exist
      if (authError.message?.includes('Database error') || authError.code === 'unexpected_failure') {
        console.log('Database error detected, checking if user was created in auth.users...');
        
        // Wait a moment for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to find the user by email using listUsers
        try {
          const { data: existingAuthUser, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) {
            console.error('Error listing users:', listError);
          } else if (existingAuthUser?.users) {
            const user = existingAuthUser.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase());
            
            if (user) {
              console.log('User was created in auth.users despite error, continuing with Users table creation...');
              console.log('Found user ID:', user.id);
              
              // User exists in auth.users, continue with creating Users table entry
              const userId = user.id;
              
              // Try to create Users table entry
              const userData = {
                id: userId.toString(),
                email: email.trim().toLowerCase(),
                Firstname: firstName.trim(),
                Surname: surname?.trim() || '',
                avatarUrl: avatarUrl || null,
                role: 'MEMBER',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              let usersInsertError = null;
              const { error: usersError } = await supabaseAdmin
                .from('Users')
                .insert(userData);

              if (usersError) {
                console.warn('Error inserting into Users table, trying User table:', usersError);
                // Try User table (singular) as fallback
                const { error: userTableError } = await supabaseAdmin
                  .from('User')
                  .insert(userData);

                if (userTableError) {
                  console.error('Failed to create Users table entry in both tables:', userTableError);
                  usersInsertError = userTableError;
                }
              }
              
              if (!usersInsertError) {
                // Success - user exists in both tables
                console.log('Successfully created Users table entry');
                return NextResponse.json({
                  success: true,
                  user: {
                    id: user.id,
                    email: user.email,
                    user_metadata: user.user_metadata,
                  },
                });
              } else {
                // User exists in auth.users but we couldn't create Users entry
                console.error('User exists in auth.users but failed to create Users table entry');
                return NextResponse.json(
                  { 
                    error: 'User created but profile setup failed', 
                    details: 'Account was created but there was an issue setting up your profile. Please try logging in.',
                    hint: 'You may need to contact support to complete your profile setup.'
                  },
                  { status: 500 }
                );
              }
            } else {
              console.log('User not found in auth.users after database error');
            }
          }
        } catch (checkError: any) {
          console.error('Error checking for existing user:', checkError);
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to create user account', 
          details: authError.message || 'Unknown error',
          code: authError.code,
          status: authError.status,
        },
        { status: 400 }
      );
    }

    if (!authData?.user) {
      return NextResponse.json(
        { error: 'User creation failed: No user data returned' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Manually create user in Users table (bypassing trigger)
    // Try Users table first
    let insertError = null;
    const userData = {
      id: userId.toString(),
      email: email.trim().toLowerCase(),
      Firstname: firstName.trim(),
      Surname: surname?.trim() || '',
      avatarUrl: avatarUrl || null,
      role: 'MEMBER',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error: usersError } = await supabaseAdmin
      .from('Users')
      .insert(userData);

    if (usersError) {
      console.warn('Error inserting into Users table, trying User table:', usersError);
      // Try User table (singular) as fallback
      const { error: userTableError } = await supabaseAdmin
        .from('User')
        .insert(userData);

      if (userTableError) {
        console.error('Error inserting into User table:', userTableError);
        insertError = userTableError;
      }
    }

    if (insertError) {
      // User was created in auth.users but not in Users table
      // This is not ideal, but the user can still log in
      console.error('Warning: User created in auth.users but failed to create in Users table:', insertError);
      // Don't fail the request - the user can still log in and we can fix this later
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: authData.user.user_metadata,
      },
    });
  } catch (error: any) {
    console.error('Error in register API route:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack }),
      },
      { status: 500 }
    );
  }
}

