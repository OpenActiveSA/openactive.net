// @ts-nocheck
import { NextRequest, NextResponse, RouteHandler } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export const GET: RouteHandler = async (
  _request: NextRequest,
  context
) => {
  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    console.error('Supabase configuration error:', error);
    return NextResponse.json(
      { error: 'SUPABASE_NOT_CONFIGURED' },
      { status: 500 }
    );
  }

  const { username } = await Promise.resolve(context?.params);
  const trimmedEmail = username?.trim(); // Using email passed as username parameter

  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return NextResponse.json({ error: 'MISSING_EMAIL' }, { status: 400 });
  }

  console.log('[api/users] Fetching user by email', { email: trimmedEmail });

  const { data, error } = await supabase
    .from('Users')
    .select('id, Firstname, Surname, email, role')
    .eq('email', trimmedEmail)
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
    console.warn('[api/users] User not found', { email: trimmedEmail });
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  console.log('[api/users] Returning user', {
    id: data.id,
    email: data.email,
    Firstname: data.Firstname,
    Surname: data.Surname,
  });

  return NextResponse.json({ user: data });
};

