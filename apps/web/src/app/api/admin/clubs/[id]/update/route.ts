import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase';
import { getClubTimezone } from '@/lib/timezone-utils';

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
    const countryValue = body.country && body.country.trim() ? body.country.trim() : null;
    const updateData: any = {
      name: body.name.trim(),
      country: countryValue,
      province: body.province && body.province.trim() ? body.province.trim() : null,
      updatedAt: new Date().toISOString(),
    };
    
    // Auto-populate timezone from country if country is set and timezone is not explicitly provided
    // Only update timezone if it's not already set (to allow manual override)
    if (countryValue && body.timezone === undefined) {
      // Get current timezone from database to check if it's already set
      const { data: currentClub } = await supabase
        .from('Clubs')
        .select('timezone')
        .eq('id', id)
        .maybeSingle();
      
      // Only auto-populate if timezone is not already set
      if (!currentClub?.timezone || currentClub.timezone.trim() === '') {
        const autoTimezone = getClubTimezone(countryValue, null);
        if (autoTimezone && autoTimezone !== 'UTC') {
          updateData.timezone = autoTimezone;
          console.log(`Auto-populating timezone for club ${id}: ${autoTimezone} (from country: ${countryValue})`);
        }
      }
    } else if (body.timezone !== undefined) {
      // If timezone is explicitly provided, use it
      updateData.timezone = body.timezone && body.timezone.trim() ? body.timezone.trim() : null;
    }

    // Add is_active if provided
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    } else {
      updateData.is_active = true;
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
      console.log('API: Setting hoverColor to:', updateData.hoverColor);
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
    if (body.membersBookingDays !== undefined) {
      const days = typeof body.membersBookingDays === 'number' 
        ? body.membersBookingDays 
        : (body.membersBookingDays ? parseInt(String(body.membersBookingDays), 10) : null);
      if (days !== null && !isNaN(days) && days > 0) {
        updateData.membersBookingDays = days;
      }
    }
    if (body.visitorBookingDays !== undefined) {
      const days = typeof body.visitorBookingDays === 'number' 
        ? body.visitorBookingDays 
        : (body.visitorBookingDays ? parseInt(String(body.visitorBookingDays), 10) : null);
      if (days !== null && !isNaN(days) && days > 0) {
        updateData.visitorBookingDays = days;
      }
    }
    if (body.coachBookingDays !== undefined) {
      const days = typeof body.coachBookingDays === 'number' 
        ? body.coachBookingDays 
        : (body.coachBookingDays ? parseInt(String(body.coachBookingDays), 10) : null);
      if (days !== null && !isNaN(days) && days > 0) {
        updateData.coachBookingDays = days;
      }
    }
    if (body.clubManagerBookingDays !== undefined) {
      const days = typeof body.clubManagerBookingDays === 'number' 
        ? body.clubManagerBookingDays 
        : (body.clubManagerBookingDays !== null && body.clubManagerBookingDays !== undefined ? parseInt(String(body.clubManagerBookingDays), 10) : null);
      // Allow 0 and positive numbers (0 means they can only book today)
      if (days !== null && !isNaN(days) && days >= 0) {
        updateData.clubManagerBookingDays = days;
        console.log('Setting clubManagerBookingDays to:', days);
      } else {
        console.log('clubManagerBookingDays validation failed:', { days, bodyValue: body.clubManagerBookingDays });
      }
    }

    // Add module settings
    const moduleFields = [
      'moduleCourtBooking',
      'moduleMemberManager',
      'moduleWebsite',
      'moduleEmailers',
      'moduleVisitorPayment',
      'moduleFloodlightPayment',
      'moduleEvents',
      'moduleCoaching',
      'moduleLeague',
      'moduleAccessControl',
      'moduleFinanceIntegration',
    ];

    console.log('API Route - Received module settings from body:', {
      moduleCourtBooking: body.moduleCourtBooking,
      moduleMemberManager: body.moduleMemberManager,
      moduleWebsite: body.moduleWebsite,
      moduleEmailers: body.moduleEmailers,
      moduleVisitorPayment: body.moduleVisitorPayment,
      moduleFloodlightPayment: body.moduleFloodlightPayment,
      moduleEvents: body.moduleEvents,
      moduleCoaching: body.moduleCoaching,
      moduleLeague: body.moduleLeague,
      moduleAccessControl: body.moduleAccessControl,
      moduleFinanceIntegration: body.moduleFinanceIntegration,
    });

    moduleFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = Boolean(body[field]);
        console.log(`API Route - Added ${field} to updateData:`, updateData[field]);
      } else {
        console.log(`API Route - ${field} is undefined in body, skipping`);
      }
    });

    console.log('API Route - Final updateData with modules:', JSON.stringify(updateData, null, 2));

    // Perform the update - try with all fields first
    console.log('Updating club with data:', JSON.stringify(updateData, null, 2));
    let data, error;
    const result = await supabase
      .from('Clubs')
      .update(updateData)
      .eq('id', id)
      .select('id, name, moduleCourtBooking, moduleMemberManager, moduleWebsite, moduleEmailers, moduleVisitorPayment, moduleFloodlightPayment, moduleEvents, moduleCoaching, moduleLeague, moduleAccessControl, moduleFinanceIntegration')
      .single();
    
    data = result.data;
    error = result.error;
    console.log('Update result:', { 
      success: !error, 
      data: data ? { 
        id: data.id, 
        name: data.name,
        moduleCourtBooking: data.moduleCourtBooking,
        moduleMemberManager: data.moduleMemberManager,
        moduleWebsite: data.moduleWebsite,
        moduleEmailers: data.moduleEmailers,
        moduleVisitorPayment: data.moduleVisitorPayment,
        moduleFloodlightPayment: data.moduleFloodlightPayment,
        moduleEvents: data.moduleEvents,
        moduleCoaching: data.moduleCoaching,
        moduleLeague: data.moduleLeague,
        moduleAccessControl: data.moduleAccessControl,
        moduleFinanceIntegration: data.moduleFinanceIntegration,
      } : null, 
      error: error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      } : null 
    });

    // If error is about missing columns, try without optional fields
    if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache') || error.message?.includes('Could not find'))) {
      console.warn('Missing column detected, trying update without optional fields');
      console.log('Error details:', error.message);
      console.log('Update data before fallback:', updateData);
      // Remove fields that might not exist, but keep logo and basic fields
      const { 
        backgroundImage: __, 
        backgroundColor: ___, 
        selectedColor: ____, 
        actionColor: _____, 
        fontColor: ______, 
        hoverColor: _______, 
        sessionDuration: ________,
        membersBookingDays: _________,
        visitorBookingDays: __________,
        coachBookingDays: ___________,
        clubManagerBookingDays: ____________,
        moduleCourtBooking: _____________,
        moduleMemberManager: ______________,
        moduleWebsite: _______________,
        moduleEmailers: ________________,
        moduleVisitorPayment: _________________,
        moduleFloodlightPayment: __________________,
        moduleEvents: ___________________,
        moduleCoaching: ____________________,
        moduleLeague: _____________________,
        moduleRankings: ______________________,
        moduleMarketing: _______________________,
        moduleAccessControl: ________________________,
        moduleClubWallet: _________________________,
        moduleFinanceIntegration: __________________________,
        ...basicUpdateData 
      } = updateData;
      // Keep logo in basicUpdateData if it was provided
      if (updateData.logo !== undefined) {
        basicUpdateData.logo = updateData.logo;
      }
      
      // Try to select module columns if they exist, otherwise select all
      let basicResult;
      try {
        basicResult = await supabase
          .from('Clubs')
          .update(basicUpdateData)
          .eq('id', id)
          .select('id, name, moduleCourtBooking, moduleMemberManager, moduleWebsite, moduleEmailers, moduleVisitorPayment, moduleFloodlightPayment, moduleEvents, moduleCoaching, moduleLeague, moduleAccessControl, moduleFinanceIntegration')
          .single();
      } catch (selectError) {
        // If selecting specific columns fails (e.g., module columns don't exist), select all
        basicResult = await supabase
          .from('Clubs')
          .update(basicUpdateData)
          .eq('id', id)
          .select()
          .single();
      }
      
      data = basicResult.data;
      error = basicResult.error;
      
      if (!error && data) {
        // Check if module fields were in the update but were removed
        const hadModuleFields = updateData.moduleCourtBooking !== undefined || 
                                updateData.moduleMemberManager !== undefined ||
                                updateData.moduleWebsite !== undefined ||
                                updateData.moduleEmailers !== undefined ||
                                updateData.moduleVisitorPayment !== undefined ||
                                updateData.moduleFloodlightPayment !== undefined ||
                                updateData.moduleEvents !== undefined ||
                                updateData.moduleCoaching !== undefined ||
                                updateData.moduleLeague !== undefined ||
                                updateData.moduleAccessControl !== undefined ||
                                updateData.moduleFinanceIntegration !== undefined;
        
        // Update succeeded without optional fields
        const warningMessage = hadModuleFields 
          ? 'Module settings were not saved because the module columns do not exist in the database. Please run the migration script: ADD_CLUB_MODULE_COLUMNS.sql. Other fields were updated successfully.'
          : 'Some fields were not updated because the columns do not exist in the database. Please run the migration scripts: ADD_ALL_CLUB_BRANDING_COLUMNS.sql, ADD_ALL_BOOKING_DAYS_COLUMNS.sql, and ADD_CLUB_MODULE_COLUMNS.sql';
        
        return NextResponse.json({ 
          success: true, 
          data,
          warning: warningMessage
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

