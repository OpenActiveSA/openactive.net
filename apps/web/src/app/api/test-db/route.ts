import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    // Test 1: Check if table exists
    const { data: tableData, error: tableError } = await supabase
      .from('Users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      return NextResponse.json({
        success: false,
        error: 'Table query failed',
        details: {
          code: tableError.code,
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint,
        },
        fullError: JSON.stringify(tableError, Object.getOwnPropertyNames(tableError), 2),
        errorString: String(tableError),
      }, { status: 500 });
    }
    
    // Test 2: Check table structure
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('id, email, Firstname, Surname, name, surname, displayName')
      .limit(1)
      .maybeSingle();
    
    if (userError && userError.code !== 'PGRST116') {
      return NextResponse.json({
        success: false,
        error: 'Column query failed',
        details: {
          code: userError.code,
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
        },
      }, { status: 500 });
    }
    
    // Test 3: Count users
    const { count, error: countError } = await supabase
      .from('Users')
      .select('*', { count: 'exact', head: true });
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      userCount: count || 0,
      sampleUser: userData,
      hasFirstnameColumn: userData !== null && 'Firstname' in (userData || {}),
      hasSurnameColumn: userData !== null && 'Surname' in (userData || {}),
      hasNameColumn: userData !== null && 'name' in (userData || {}),
      hasSurnameLowerColumn: userData !== null && 'surname' in (userData || {}),
      hasDisplayNameColumn: userData !== null && 'displayName' in (userData || {}),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: 'Exception occurred',
      message: err?.message || String(err),
      stack: err?.stack,
    }, { status: 500 });
  }
}

