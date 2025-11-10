// @ts-nocheck
import { NextRequest, NextResponse, RouteHandler } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const GET: RouteHandler = async (
  _request: NextRequest,
  context
) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase environment variables are missing or invalid.');
    return NextResponse.json(
      { error: 'SUPABASE_NOT_CONFIGURED' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { username } = await Promise.resolve(context?.params);
  const trimmedUsername = username?.trim();

  if (!trimmedUsername) {
    return NextResponse.json({ error: 'MISSING_USERNAME' }, { status: 400 });
  }

  console.log('[api/users] Fetching user', { username: trimmedUsername });

  const { data, error } = await supabase
    .from('User')
    .select('id, username, displayName, email, role')
    .eq('username', trimmedUsername)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[api/users] Supabase query failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
  }

  if (!data) {
    console.warn('[api/users] User not found', { username: trimmedUsername });
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  console.log('[api/users] Returning user', {
    id: data.id,
    username: data.username,
    displayName: data.displayName,
  });

  return NextResponse.json({ user: data });
};

