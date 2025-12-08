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
    // Note: numberOfCourts is no longer used - courts are managed via the Courts table
    const updateData: any = {
      name: body.name.trim(),
      country: body.country && body.country.trim() ? body.country.trim() : null,
      province: body.province && body.province.trim() ? body.province.trim() : null,
      updatedAt: new Date().toISOString(),
    };

    // Add status if provided, otherwise use is_active for backwards compatibility
    if (body.status) {
      updateData.status = body.status;
      // Update is_active based on status for backwards compatibility
      updateData.is_active = body.status !== 'DISABLED';
    } else if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
      // Set status based on is_active if status not provided
      updateData.status = body.is_active ? 'ACTIVE_FREE' : 'DISABLED';
    } else {
      updateData.is_active = true;
      updateData.status = 'ACTIVE_FREE';
    }

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
    if (body.hoverColor !== undefined) {
      updateData.hoverColor = body.hoverColor && body.hoverColor.trim() ? body.hoverColor.trim() : null;
    }
    if (body.openingTime !== undefined) {
      updateData.openingTime = body.openingTime && body.openingTime.trim() ? body.openingTime.trim() : null;
    }
    if (body.closingTime !== undefined) {
      updateData.closingTime = body.closingTime && body.closingTime.trim() ? body.closingTime.trim() : null;
    }
    if (body.bookingSlotInterval !== undefined) {
      const interval = typeof body.bookingSlotInterval === 'number' 
        ? body.bookingSlotInterval 
        : (body.bookingSlotInterval ? parseInt(String(body.bookingSlotInterval), 10) : null);
      if (interval !== null && !isNaN(interval) && interval > 0) {
        updateData.bookingSlotInterval = interval;
      } else {
        updateData.bookingSlotInterval = null;
      }
    }
    if (body.sessionDuration !== undefined) {
      // sessionDuration is stored as JSONB array
      if (Array.isArray(body.sessionDuration) && body.sessionDuration.length > 0) {
        updateData.sessionDuration = body.sessionDuration;
      } else {
        updateData.sessionDuration = [60]; // Default to [60] if empty or invalid
      }
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
      const { logo: _, backgroundImage: __, backgroundColor: ___, selectedColor: ____, actionColor: _____, fontColor: ______, hoverColor: _______, sessionDuration: ________, ...basicUpdateData } = updateData;
      
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
          warning: 'Some branding fields were not updated because the columns do not exist in the database. Please run the migration script: ADD_ALL_CLUB_BRANDING_COLUMNS.sql (or ADD_CLUB_HOVER_COLOR.sql if only hoverColor is missing)'
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

