import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId, adminUserId, clubSlug } = body;

    console.log('Impersonate request received:', { targetUserId, adminUserId, clubSlug });

    if (!targetUserId || !adminUserId) {
      console.error('Missing required parameters:', { targetUserId, adminUserId });
      return NextResponse.json(
        { error: 'Missing targetUserId or adminUserId' },
        { status: 400 }
      );
    }

    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseServerClient();
      console.log('Supabase admin client created successfully');
    } catch (supabaseError: any) {
      console.error('Error creating Supabase admin client:', supabaseError);
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client', details: supabaseError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    // Verify the admin user is a SUPER_ADMIN
    // Try both 'Users' and 'User' table names for compatibility
    let adminUser: { role: string } | null = null;
    let adminError: any = null;

    const { data: usersAdminData, error: usersAdminError } = await supabaseAdmin
      .from('Users')
      .select('role')
      .eq('id', adminUserId)
      .maybeSingle();

    if (usersAdminError && usersAdminError.code !== 'PGRST116') {
      adminError = usersAdminError;
    } else if (usersAdminData) {
      adminUser = usersAdminData;
    }

    // If not found in 'Users', try 'User' table
    if (!adminUser && !adminError) {
      const { data: userAdminData, error: userAdminError } = await supabaseAdmin
        .from('User')
        .select('role')
        .eq('id', adminUserId)
        .maybeSingle();

      if (userAdminError && userAdminError.code !== 'PGRST116') {
        adminError = userAdminError;
      } else if (userAdminData) {
        adminUser = userAdminData;
      }
    }

    if (adminError) {
      console.error('Error checking admin user:', adminError);
      return NextResponse.json(
        { error: 'Failed to verify admin user', details: adminError.message },
        { status: 500 }
      );
    }

    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only SUPER_ADMIN can impersonate users' },
        { status: 403 }
      );
    }

    // Get the target user's email from Users table (more reliable than auth API)
    // Try both 'Users' and 'User' table names for compatibility
    let targetUser: { email: string; id: string } | null = null;
    let targetUserError: any = null;

    // Try 'Users' table first
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('Users')
      .select('email, id')
      .eq('id', targetUserId)
      .maybeSingle();

    if (usersError && usersError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine, we'll try 'User' table
      console.error('Error getting target user from Users table:', usersError);
    } else if (usersData) {
      targetUser = usersData;
    }

    // If not found in 'Users', try 'User' table
    if (!targetUser) {
      const { data: userData, error: userError } = await supabaseAdmin
        .from('User')
        .select('email, id')
        .eq('id', targetUserId)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error getting target user from User table:', userError);
        targetUserError = userError;
      } else if (userData) {
        targetUser = userData;
      }
    }

    if (targetUserError) {
      return NextResponse.json(
        { error: 'Failed to get target user', details: targetUserError.message },
        { status: 500 }
      );
    }

    if (!targetUser || !targetUser.email) {
      console.error('Target user not found:', { targetUserId, targetUser });
      return NextResponse.json(
        { error: 'Target user not found or has no email', details: `User ID: ${targetUserId}` },
        { status: 404 }
      );
    }

    console.log('Target user found:', { email: targetUser.email, id: targetUser.id });

    // Determine redirect URL - if clubSlug is provided, redirect to that club, otherwise to clubs list
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = clubSlug 
      ? `${baseUrl}/club/${clubSlug}`
      : `${baseUrl}/clubs`;

    console.log('Generating magic link with:', { email: targetUser.email, redirectTo });

    // Check if user exists in Supabase Auth (for logging purposes)
    let authUserId: string | null = null;
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users) {
        const existingUser = users.find(u => u.email === targetUser.email);
        if (existingUser) {
          authUserId = existingUser.id;
          console.log('User found in auth.users:', { email: targetUser.email, id: authUserId });
        } else {
          console.log('User not found in auth.users - generateLink will attempt to create them');
        }
      }
    } catch (listErr: any) {
      console.warn('Could not check if user exists (continuing anyway):', listErr?.message);
    }

    // Generate the magic link directly
    // If user doesn't exist in auth.users, generateLink will try to create them automatically
    // This might fail if there's a database trigger conflict (user exists in Users table but not auth.users)
    // In that case, we'll catch the error and provide helpful guidance
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      console.error('Link error details:', {
        message: linkError.message,
        name: linkError.name,
        status: linkError.status,
        code: linkError.code,
        authUserId
      });
      
      // Provide more helpful error message
      let errorDetails = linkError.message || 'Unknown error';
      let errorCode = linkError.code || 'UNKNOWN';
      
      // Handle database error - user exists in Users table but not in auth.users
      if (linkError.message?.includes('Database error') || linkError.message?.includes('saving new user') || linkError.message?.includes('creating new user')) {
        errorDetails = `This user exists in the database but not in Supabase Auth. They need to sign up through the app first, or their account needs to be manually linked to Supabase Auth.`;
        return NextResponse.json(
          { 
            error: 'Cannot impersonate this user', 
            details: errorDetails,
            hint: 'The user should visit the login page and sign up, or you may need to manually create their auth account in Supabase Dashboard.',
            linkError: linkError.message,
            linkErrorCode: errorCode,
            targetEmail: targetUser.email
          },
          { status: 400 }
        );
      }
      
      if (linkError.message?.includes('User not found') || linkError.message?.includes('not found')) {
        errorDetails = `User with email ${targetUser.email} does not exist in Supabase Auth. The user may need to sign up first.`;
      } else if (linkError.message?.includes('Invalid email')) {
        errorDetails = `Invalid email format: ${targetUser.email}`;
      } else if (linkError.message?.includes('rate limit') || linkError.message?.includes('too many')) {
        errorDetails = `Rate limit exceeded. Please wait a moment and try again.`;
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to generate impersonation link', 
          details: errorDetails,
          linkError: linkError.message,
          linkErrorCode: errorCode,
          targetEmail: targetUser.email,
          authUserId
        },
        { status: 500 }
      );
    }

    if (!linkData?.properties?.action_link) {
      console.error('No action_link in linkData:', linkData);
      return NextResponse.json(
        { error: 'Failed to generate impersonation link: No link returned' },
        { status: 500 }
      );
    }

    // Return the magic link
    return NextResponse.json({
      success: true,
      magicLink: linkData.properties.action_link,
      targetUserId
    });
  } catch (error: any) {
    console.error('Error in impersonate route:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error?.message || 'Unknown error',
        errorType: error?.name || 'Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    );
  }
}

