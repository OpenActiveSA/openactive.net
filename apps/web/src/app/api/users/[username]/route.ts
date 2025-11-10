import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    'Supabase environment variables are missing. API routes depending on Supabase will fail.'
  );
}

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  if (!supabase) {
    return NextResponse.json(
      { error: 'SUPABASE_NOT_CONFIGURED' },
      { status: 500 }
    );
  }

  const { username } = await params;
  const trimmedUsername = username?.trim();

  if (!trimmedUsername) {
    return NextResponse.json({ error: 'MISSING_USERNAME' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('User')
    .select('id, username, displayName, email, role')
    .eq('username', trimmedUsername)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Supabase query failed', error);
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ user: data });
}

