import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify the request has the required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Club name is required' },
        { status: 400 }
      );
    }

    // Use server client (bypasses RLS)
    const supabase = getSupabaseServerClient();

    // Build update object
    const updateData: any = {
      name: body.name.trim(),
      numberOfCourts: body.numberOfCourts || 1,
      country: body.country && body.country.trim() ? body.country.trim() : null,
      province: body.province && body.province.trim() ? body.province.trim() : null,
      is_active: body.is_active !== undefined ? body.is_active : true,
      updatedAt: new Date().toISOString(),
    };

    // Add branding fields if provided (only if they exist in the request)
    // We'll try to update them, but if columns don't exist, we'll handle it gracefully
    if (body.logo !== undefined) {
      updateData.logo = body.logo && body.logo.trim() ? body.logo.trim() : null;
    }
    if (body.backgroundImage !== undefined) {
      updateData.backgroundImage = body.backgroundImage && body.backgroundImage.trim() ? body.backgroundImage.trim() : null;
    }
    if (body.backgroundColor !== undefined) {
      updateData.backgroundColor = body.backgroundColor && body.backgroundColor.trim() ? body.backgroundColor.trim() : null;
    }
    if (body.selectedColor !== undefined) {
      updateData.selectedColor = body.selectedColor && body.selectedColor.trim() ? body.selectedColor.trim() : null;
    }
    if (body.actionColor !== undefined) {
      updateData.actionColor = body.actionColor && body.actionColor.trim() ? body.actionColor.trim() : null;
    }
    if (body.fontColor !== undefined) {
      updateData.fontColor = body.fontColor && body.fontColor.trim() ? body.fontColor.trim() : null;
    }

    // Perform the update - try with all fields first
    let data, error;
    const result = await supabase
      .from('Clubs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    data = result.data;
    error = result.error;

    // If error is about missing columns, try without branding fields
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      console.warn('Missing column detected, trying update without branding fields');
      const { logo: _, backgroundImage: __, backgroundColor: ___, selectedColor: ____, actionColor: _____, fontColor: ______, ...basicUpdateData } = updateData;
      
      const basicResult = await supabase
        .from('Clubs')
        .update(basicUpdateData)
        .eq('id', id)
        .select()
        .single();
      
      data = basicResult.data;
      error = basicResult.error;
      
      if (!error && data) {
        // Update succeeded without branding fields
        return NextResponse.json({ 
          success: true, 
          data,
          warning: 'Some branding fields were not updated because the columns do not exist in the database. Please run the migration scripts: ADD_CLUB_BRANDING_FIELDS.sql, ADD_CLUB_BACKGROUND_IMAGE.sql, and ADD_CLUB_FONT_COLOR.sql'
        });
      }
    }

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update club', details: error },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

