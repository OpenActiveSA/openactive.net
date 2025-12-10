'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClientClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import styles from '@/styles/frontend.module.css';
import type { ClubSettings } from '@/lib/club-settings';

interface Player {
  id: string;
  name: string;
  email: string;
  isGuest?: boolean;
  avatarUrl?: string | null;
}

interface ConfirmClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ConfirmBookingContent({ slug, clubSettings }: ConfirmClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { contentVisible, setContentVisible } = useClubAnimation();
  
  const [club, setClub] = useState<{ id: string } | null>(null);
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

  // Trigger content visibility immediately since we have club settings
  useEffect(() => {
    setContentVisible(true);
  }, [setContentVisible]);

  // Load club ID
  useEffect(() => {
    if (clubSettings.id) {
      setClub({ id: clubSettings.id });
    }
  }, [clubSettings.id]);
  
  // Parse players from URL and fetch avatar URLs
  useEffect(() => {
    const loadPlayersWithAvatars = async () => {
      if (playersParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(playersParam));
          const playersList = Array.isArray(parsed) ? parsed : [];
          
          // Fetch avatar URLs for players that have IDs and aren't guests
          const playersWithAvatars = await Promise.all(
            playersList.map(async (player: any) => {
              if (player.isGuest || !player.id || player.id === 'guest') {
                return { ...player, avatarUrl: null };
              }
              
              try {
                const supabase = getSupabaseClientClient();
                const { data } = await supabase
                  .from('Users')
                  .select('avatarUrl')
                  .eq('id', player.id)
                  .maybeSingle();
                
                return {
                  ...player,
                  avatarUrl: data?.avatarUrl || null
                };
              } catch (err) {
                console.error('Error fetching avatar for player:', err);
                return { ...player, avatarUrl: null };
              }
            })
          );
          
          setPlayers(playersWithAvatars);
        } catch (err) {
          console.error('Error parsing players:', err);
          setPlayers([]);
        }
      }
    };
    
    loadPlayersWithAvatars();
  }, [playersParam]);

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
      
      // Prepare booking data - map players to individual player fields
      const playerIds = players.filter(p => !p.isGuest && p.id && p.id !== 'guest').map(p => p.id);
      const guestNames = players.filter(p => p.isGuest).map(p => p.name);
      
      const bookingDataToInsert: any = {
        clubId: club.id,
        userId: user.id,
        courtNumber: courtNumber,
        bookingDate: date,
        startTime: time,
        endTime: endTime,
        duration: parseInt(duration),
        status: 'pending',
        bookingType: bookingType
      };
      
      // Map players to individual player fields (player1Id, player2Id, etc.)
      if (playerIds.length > 0) {
        bookingDataToInsert.player1Id = playerIds[0] || null;
        if (playerIds.length > 1) bookingDataToInsert.player2Id = playerIds[1] || null;
        if (playerIds.length > 2) bookingDataToInsert.player3Id = playerIds[2] || null;
        if (playerIds.length > 3) bookingDataToInsert.player4Id = playerIds[3] || null;
      }
      
      // Map guest names
      if (guestNames.length > 0) {
        bookingDataToInsert.guestPlayer1Name = guestNames[0] || null;
        if (guestNames.length > 1) bookingDataToInsert.guestPlayer2Name = guestNames[1] || null;
        if (guestNames.length > 2) bookingDataToInsert.guestPlayer3Name = guestNames[2] || null;
      }
      
      console.log('Creating booking with data:', bookingDataToInsert);
      
      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('Bookings')
        .insert(bookingDataToInsert)
        .select()
        .single();
      
      if (bookingError) {
        console.error('Error creating booking - Full error object:', bookingError);
        console.error('Error code:', bookingError.code);
        console.error('Error message:', bookingError.message);
        console.error('Error details:', bookingError.details);
        console.error('Error hint:', bookingError.hint);
        
        // Try to extract a meaningful error message
        let errorMessage = 'Failed to create booking. Please try again.';
        
        if (bookingError.message) {
          errorMessage = bookingError.message;
        } else if (bookingError.details) {
          errorMessage = bookingError.details;
        } else if (bookingError.hint) {
          errorMessage = bookingError.hint;
        } else if (bookingError.code) {
          errorMessage = `Database error (${bookingError.code}). Please try again.`;
        }
        
        throw new Error(errorMessage);
      }
      
      if (!bookingData) {
        throw new Error('Booking was not created. Please try again.');
      }
      
      // Redirect to booking page with date and time selected to show the new booking
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (time) params.set('time', time);
      router.push(`/club/${slug}?${params.toString()}`);
    } catch (err: any) {
      console.error('Error confirming booking:', err);
      let errorMessage = 'Failed to confirm booking. Please try again.';
      
      if (err?.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (err) {
        // Try to extract any useful information from the error
        errorMessage = JSON.stringify(err);
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: clubSettings.backgroundColor }}>
      <ClubHeader 
        logo={clubSettings.logo} 
        fontColor={clubSettings.fontColor} 
        backgroundColor={clubSettings.backgroundColor} 
        selectedColor={clubSettings.selectedColor} 
        currentPath={`/club/${slug}/confirm`} 
      />
      
      <div 
        className={styles.confirmPageContainer}
        style={{ 
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <h1 className={styles.confirmPageTitle} style={{ color: clubSettings.fontColor }}>
          Confirm booking
        </h1>

        {/* Pricing Summary Card */}
        <div className={styles.pricingSummaryCard}>
          <div className={styles.pricingRateType}>
            {pricing.rateType}
          </div>
          {pricing.visitorCount > 0 && (
            <div className={styles.pricingItem}>
              {pricing.visitorCount} x Visitor: R{pricing.visitorTotal}
            </div>
          )}
          {pricing.memberCount > 0 && pricing.memberTotal > 0 && (
            <div className={styles.pricingItem}>
              {pricing.memberCount} x Member: R{pricing.memberTotal}
            </div>
          )}
          <div className={styles.pricingItem}>
            Court flood lights: R{pricing.floodLights}
          </div>
          <div className={styles.pricingTotal}>
            R{pricing.total} due
          </div>
        </div>

        {/* Booking Details Card */}
        <div className={styles.bookingDetailsCard}>
          {formattedDate && (
            <div className={styles.bookingDetailItem}>
              {formattedDate.full}
            </div>
          )}
          {time && duration && (
            <div className={styles.bookingDetailItem}>
              {time} for {duration}min
            </div>
          )}
          {court && (
            <div className={styles.bookingDetailItemLast}>
              Court {court}
            </div>
          )}

          {/* Players */}
          {players.length > 0 && (
            <div className={styles.playersContainer}>
              {players.map((player, index) => (
                <div key={index} className={styles.playerItem}>
                  <div className={`${styles.playerAvatarConfirm} ${player.isGuest ? styles.playerAvatarGuest : ''}`}>
                    {player.avatarUrl ? (
                      <img 
                        src={player.avatarUrl} 
                        alt={player.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span style="color: #ffffff; font-weight: 600; font-size: 18px;">${player.name.charAt(0).toUpperCase()}</span>`;
                          }
                        }}
                      />
                    ) : (
                      player.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles.playerNameConfirm}>
                    {player.name}
                  </div>
                  {player.isGuest && (
                    <div className={styles.playerGuestLabel}>
                      Guest
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.confirmButtonsContainer}>
          <button
            onClick={() => router.back()}
            className={`${styles.confirmButton} ${styles.confirmButtonBack}`}
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            onClick={handleConfirmBooking}
            disabled={isSubmitting || !club || !date || !time || !duration || !court}
            className={`${styles.confirmButton} ${styles.confirmButtonSubmit}`}
            style={{
              backgroundColor: clubSettings.selectedColor,
              borderColor: clubSettings.selectedColor
            }}
          >
            {isSubmitting ? 'Processing...' : 'Confirm & Pay'}
          </button>
        </div>
      </div>

      <ClubFooter fontColor={clubSettings.fontColor} />
    </div>
  );
}

export default function ConfirmClient({ slug, clubSettings }: ConfirmClientProps) {
  return (
    <ClubAnimationProvider>
      <ConfirmBookingContent slug={slug} clubSettings={clubSettings} />
    </ClubAnimationProvider>
  );
}

