'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { useAuth } from '@/lib/auth-context';
import ClubHeader from '../ClubHeader';
import ClubFooter from '../ClubFooter';
import styles from '@/styles/frontend.module.css';

interface Club {
  id: string;
  name: string;
  logo?: string;
  backgroundColor?: string;
  fontColor?: string;
  selectedColor?: string;
  hoverColor?: string;
}

interface Player {
  id: string;
  name: string;
  email: string;
  isGuest?: boolean;
}

export default function ConfirmBookingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [club, setClub] = useState<Club | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [hoverColor, setHoverColor] = useState('#f0f0f0');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Get booking details from URL params
  const courtId = searchParams.get('courtId');
  const court = searchParams.get('court');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const duration = searchParams.get('duration');
  const bookingType = searchParams.get('bookingType') || 'singles';
  
  // Parse players from URL params
  const playersParam = searchParams.get('players');
  const [players, setPlayers] = useState<Player[]>([]);
  
  // Format date for display
  const formattedDate = useMemo(() => {
    if (!date) return null;
    const d = new Date(date);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      full: d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
    };
  }, [date]);

  // Parse players from URL
  useEffect(() => {
    if (playersParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(playersParam));
        setPlayers(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        console.error('Error parsing players:', err);
        setPlayers([]);
      }
    }
  }, [playersParam]);

  useEffect(() => {
    const loadClub = async () => {
      try {
        const supabase = getSupabaseClientClient();
        const result = await supabase
          .from('Clubs')
          .select('id, name, logo, backgroundColor, fontColor, selectedColor, hoverColor')
          .eq('is_active', true);
        
        if (result.data) {
          const foundClub = result.data.find(
            (c) => generateSlug(c.name) === slug
          );
          
          if (foundClub) {
            setClub(foundClub as Club);
            const clubBgColor = (foundClub as any).backgroundColor;
            if (clubBgColor && typeof clubBgColor === 'string' && clubBgColor.trim() !== '') {
              setBackgroundColor(clubBgColor.trim());
            }
            const clubFontColor = (foundClub as any).fontColor;
            if (clubFontColor && typeof clubFontColor === 'string' && clubFontColor.trim() !== '') {
              setFontColor(clubFontColor.trim());
            }
            const clubSelectedColor = (foundClub as any).selectedColor;
            if (clubSelectedColor && typeof clubSelectedColor === 'string' && clubSelectedColor.trim() !== '') {
              setSelectedColor(clubSelectedColor.trim());
            }
            const clubHoverColor = (foundClub as any).hoverColor;
            if (clubHoverColor && typeof clubHoverColor === 'string' && clubHoverColor.trim() !== '') {
              setHoverColor(clubHoverColor.trim());
            }
            setLogo((foundClub as any).logo || undefined);
          }
        }
      } catch (err) {
        console.error('Error loading club:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadClub();
  }, [slug]);

  // Calculate pricing (placeholder - should be fetched from club settings)
  const calculatePricing = () => {
    const visitorCount = players.filter(p => p.isGuest).length;
    const memberCount = players.filter(p => !p.isGuest).length;
    
    // Placeholder pricing - should come from club settings
    const visitorRate = 400; // R400 per visitor
    const memberRate = 60; // R60 per member (or free)
    const floodLights = 50; // R50 for flood lights
    
    const visitorTotal = visitorCount * visitorRate;
    const memberTotal = memberCount * memberRate;
    const subtotal = visitorTotal + memberTotal;
    const total = subtotal + floodLights;
    
    return {
      visitorCount,
      memberCount,
      visitorRate,
      memberRate,
      visitorTotal,
      memberTotal,
      floodLights,
      subtotal,
      total,
      rateType: visitorCount > 0 ? 'Visitor Rate' : 'Members Rate'
    };
  };

  const pricing = calculatePricing();

  const handleConfirmBooking = async () => {
    if (!user || !club || !courtId || !date || !time || !duration) {
      setError('Missing required booking information');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();
      
      // Calculate end time
      const [hours, minutes] = time.split(':').map(Number);
      const startDateTime = new Date(date);
      startDateTime.setHours(hours, minutes, 0, 0);
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(duration));
      
      const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;
      
      // Get court number from court name (extract number or use 1 as default)
      const courtNumber = court ? parseInt(court.replace(/\D/g, '')) || 1 : 1;
      
      // Check for overlapping bookings before creating the new booking
      // Query for existing bookings on the same court, same date, with active status
      // Match by courtNumber since that's the reliable identifier
      const { data: existingBookings, error: checkError } = await supabase
        .from('Bookings')
        .select('id, startTime, endTime, courtId, courtNumber')
        .eq('clubId', club.id)
        .eq('bookingDate', date)
        .eq('courtNumber', courtNumber)
        .in('status', ['pending', 'confirmed']);
      
      if (checkError) {
        console.error('Error checking for overlapping bookings:', checkError);
        throw new Error('Failed to check booking availability. Please try again.');
      }
      
      // Check if the new booking overlaps with any existing booking
      // Two time slots overlap if: new start < existing end AND new end > existing start
      const newStartMinutes = hours * 60 + minutes;
      const newEndMinutes = newStartMinutes + parseInt(duration);
      
      const hasOverlap = existingBookings?.some((existingBooking) => {
        // Parse existing booking times
        const [existingStartHour, existingStartMin] = existingBooking.startTime.split(':').map(Number);
        const [existingEndHour, existingEndMin] = existingBooking.endTime.split(':').map(Number);
        const existingStartMinutes = existingStartHour * 60 + existingStartMin;
        const existingEndMinutes = existingEndHour * 60 + existingEndMin;
        
        // Check for overlap: new start < existing end AND new end > existing start
        return newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes;
      });
      
      if (hasOverlap) {
        throw new Error('This time slot is already booked. Please select a different time.');
      }
      
      // Prepare booking data
      const bookingData: any = {
        clubId: club.id,
        userId: user.id,
        courtId: courtId,
        courtNumber: courtNumber,
        bookingDate: date,
        startTime: time,
        endTime: endTime,
        duration: parseInt(duration),
        bookingType: bookingType === 'doubles' ? 'doubles' : 'singles',
        status: 'pending'
      };

      // Add players
      if (players.length > 0 && players[0] && !players[0].isGuest) {
        bookingData.player1Id = players[0].id;
      } else if (players.length > 0 && players[0]) {
        bookingData.guestPlayer1Name = players[0].name;
      }

      if (players.length > 1 && players[1] && !players[1].isGuest) {
        bookingData.player2Id = players[1].id;
      } else if (players.length > 1 && players[1]) {
        bookingData.guestPlayer2Name = players[1].name;
      }

      if (players.length > 2 && players[2] && !players[2].isGuest) {
        bookingData.player3Id = players[2].id;
      } else if (players.length > 2 && players[2]) {
        bookingData.guestPlayer3Name = players[2].name;
      }

      if (players.length > 3 && players[3] && !players[3].isGuest) {
        bookingData.player4Id = players[3].id;
      } else if (players.length > 3 && players[3]) {
        // Note: Bookings table only has 3 guest slots, so we might need to handle this
        bookingData.guestPlayer3Name = players[3].name;
      }

      const { data, error: insertError } = await supabase
        .from('Bookings')
        .insert([bookingData])
        .select()
        .single();

      if (insertError) {
        console.error('Booking error:', insertError);
        throw new Error(insertError.message || 'Failed to create booking');
      }

      // Navigate back to club page with the selected date and time
      // This allows the user to see their booking on the court
      const params = new URLSearchParams({
        date: date,
        time: time
      });
      router.push(`/club/${slug}?${params.toString()}`);
    } catch (err: any) {
      console.error('Error confirming booking:', err);
      setError(err.message || 'Failed to confirm booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor, color: fontColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!club || !date || !time || !duration || !court) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor, color: fontColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div>Missing booking information</div>
        <button onClick={() => router.back()} style={{ padding: '12px 24px', backgroundColor: selectedColor, color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <ClubHeader logo={logo} fontColor={fontColor} backgroundColor={backgroundColor} selectedColor={selectedColor} />
      
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '32px', color: '#052333', textAlign: 'center' }}>
          Confirm booking
        </h1>

        {/* Pricing Summary Card */}
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '20px',
          border: '1px solid rgba(5, 35, 51, 0.1)'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: '#052333', marginBottom: '12px' }}>
            {pricing.rateType}
          </div>
          {pricing.visitorCount > 0 && (
            <div style={{ fontSize: '14px', color: '#052333', marginBottom: '8px' }}>
              {pricing.visitorCount} x Visitor: R{pricing.visitorTotal}
            </div>
          )}
          {pricing.memberCount > 0 && pricing.memberTotal > 0 && (
            <div style={{ fontSize: '14px', color: '#052333', marginBottom: '8px' }}>
              {pricing.memberCount} x Member: R{pricing.memberTotal}
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#052333', marginBottom: '8px' }}>
            Court flood lights: R{pricing.floodLights}
          </div>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#052333', 
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(5, 35, 51, 0.2)'
          }}>
            R{pricing.total} due
          </div>
        </div>

        {/* Booking Details Card */}
        <div style={{ 
          backgroundColor: '#ffffff', 
          borderRadius: '12px', 
          padding: '24px', 
          marginBottom: '32px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          {formattedDate && (
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#052333', marginBottom: '12px' }}>
              {formattedDate.full}
            </div>
          )}
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#052333', marginBottom: '12px' }}>
            {time} for {duration}min
          </div>
          <div style={{ fontSize: '16px', fontWeight: '500', color: '#052333', marginBottom: '24px' }}>
            Court {court}
          </div>

          {/* Players */}
          {players.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
              {players.map((player, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#052333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: '600',
                    border: player.isGuest ? '2px solid #fbbf24' : 'none'
                  }}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#052333', textAlign: 'center', maxWidth: '60px' }}>
                    {player.name}
                  </div>
                  {player.isGuest && (
                    <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                      Guest
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#ffffff',
              color: '#052333',
              border: '2px solid rgba(5, 35, 51, 0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            onClick={handleConfirmBooking}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: selectedColor,
              color: '#ffffff',
              border: `2px solid ${selectedColor}`,
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {isSubmitting ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>

      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

