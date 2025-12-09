'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { getClubCourts, SPORT_TYPE_LABELS, type Court } from '@/lib/courts';
import ClubHeader from './ClubHeader';
import ClubFooter from './ClubFooter';
import styles from '@/styles/frontend.module.css';

interface Club {
  id: string;
  name: string;
  backgroundColor?: string;
  fontColor?: string;
  numberOfCourts?: number; // Keep for backwards compatibility
}

interface ClubPageClientProps {
  club: Club | null;
  slug: string;
  logo?: string;
  backgroundColor: string;
  fontColor: string;
  selectedColor: string;
  actionColor: string;
  hoverColor: string;
  openingTime: string;
  closingTime: string;
  bookingSlotInterval: number;
  sessionDuration: number[];
}

export default function ClubPageClient({ club, slug, logo, backgroundColor, fontColor, selectedColor, actionColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration }: ClubPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const displayName = club?.name || slug.replace(/([A-Z])/g, ' $1').trim();
  
  // Ensure sessionDuration always has a default value
  const validSessionDuration = (sessionDuration && Array.isArray(sessionDuration) && sessionDuration.length > 0) ? sessionDuration : [60];
  
  // Load courts from database
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(true);
  
  useEffect(() => {
    const loadCourts = async () => {
      if (!club?.id) {
        setIsLoadingCourts(false);
        return;
      }
      
      try {
        const supabase = getSupabaseClientClient();
        const courtsData = await getClubCourts(supabase, club.id, false); // Only active courts
        setCourts(courtsData || []);
      } catch (err) {
        console.error('Error loading courts:', err);
        setCourts([]);
      } finally {
        setIsLoadingCourts(false);
      }
    };
    
    loadCourts();
  }, [club?.id]);
  
  // Fallback to numberOfCourts if no courts found (backwards compatibility)
  const displayCourts = useMemo(() => {
    if (courts.length > 0) {
      return courts;
    }
    // Fallback: create dummy courts from numberOfCourts
    const fallbackCount = club?.numberOfCourts || 1;
    return Array.from({ length: fallbackCount }, (_, i) => ({
      id: `fallback-${i + 1}`,
      clubId: club?.id || '',
      name: `Court ${i + 1}`,
      sportType: 'TENNIS' as const,
      isActive: true,
    }));
  }, [courts, club?.numberOfCourts, club?.id]);
  
  console.log('ClubPageClient received props:', { 
    hoverColor, 
    actionColor,
    bookingSlotInterval, 
    openingTime, 
    closingTime,
    selectedColor,
    sessionDuration,
    validSessionDuration,
    courts: displayCourts
  });
  
  // Initialize selectedDate from URL params or default to today
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const urlDate = searchParams?.get('date');
    if (urlDate) {
      return urlDate;
    }
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  // Initialize selectedTime from URL params
  const [selectedTime, setSelectedTime] = useState<string | null>(() => {
    return searchParams?.get('time') || null;
  });
  
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null); // Changed to court ID
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [dateScrollIndex, setDateScrollIndex] = useState<number>(0);
  
  // Load bookings for the selected date
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  
  // Update selectedDate and selectedTime when URL params change
  useEffect(() => {
    const urlDate = searchParams?.get('date');
    const urlTime = searchParams?.get('time');
    
    if (urlDate) {
      setSelectedDate(urlDate);
    }
    if (urlTime) {
      setSelectedTime(urlTime);
    }
  }, [searchParams]);

  // Load bookings for the selected date
  useEffect(() => {
    const loadBookings = async () => {
      if (!club?.id || !selectedDate) {
        setBookings([]);
        return;
      }
      
      setIsLoadingBookings(true);
      try {
        const supabase = getSupabaseClientClient();
        // First, get all bookings for the date
        const { data, error } = await supabase
          .from('Bookings')
          .select(`
            id,
            courtId,
            courtNumber,
            startTime,
            endTime,
            duration,
            player1Id,
            player2Id,
            player3Id,
            player4Id,
            guestPlayer1Name,
            guestPlayer2Name,
            guestPlayer3Name,
            bookingType,
            userId
          `)
          .eq('clubId', club.id)
          .eq('bookingDate', selectedDate)
          .in('status', ['pending', 'confirmed']);
        
        if (error) {
          console.error('Error loading bookings:', error);
          setBookings([]);
        } else {
          // Fetch player data separately
          const bookingsWithPlayers = await Promise.all((data || []).map(async (booking) => {
            const players: Array<{ id?: string; name: string; isGuest: boolean; isPrimary: boolean }> = [];
            
            // Debug: Log the booking to see what we're working with
            console.log('Processing booking:', {
              id: booking.id,
              player1Id: booking.player1Id,
              player2Id: booking.player2Id,
              player3Id: booking.player3Id,
              player4Id: booking.player4Id,
              guestPlayer1Name: booking.guestPlayer1Name,
              guestPlayer2Name: booking.guestPlayer2Name,
              guestPlayer3Name: booking.guestPlayer3Name,
              bookingType: booking.bookingType
            });
            
            // Fetch all player IDs in order (including nulls to preserve order)
            const playerIdsInOrder = [
              booking.player1Id,
              booking.player2Id,
              booking.player3Id,
              booking.player4Id
            ].filter(Boolean) as string[];

            // Fetch player data in batch
            if (playerIdsInOrder.length > 0) {
              const { data: playersData, error: playersError } = await supabase
                .from('Users')
                .select('id, Firstname, Surname')
                .in('id', playerIdsInOrder);

              if (playersError) {
                console.error('Error fetching players:', playersError);
              }

              if (playersData) {
                // Create a map for quick lookup
                const playersMap = new Map(playersData.map(p => [p.id, p]));
                
                // Add players in order (player1, player2, player3, player4)
                [booking.player1Id, booking.player2Id, booking.player3Id, booking.player4Id].forEach((playerId, index) => {
                  if (playerId) {
                    const playerData = playersMap.get(playerId);
                    if (playerData) {
                      const name = `${playerData.Firstname || ''} ${playerData.Surname || ''}`.trim();
                      if (name) {
                        players.push({
                          id: playerId,
                          name,
                          isGuest: false,
                          isPrimary: index === 0 || playerId === booking.userId // Primary player is player1 or the booker
                        });
                      } else {
                        console.warn(`Player ${playerId} has no name (Firstname: ${playerData.Firstname}, Surname: ${playerData.Surname})`);
                      }
                    } else {
                      console.warn(`Player ${playerId} not found in database`);
                    }
                  }
                });
              }
            }
            
            // Add guest players (these are for non-registered users)
            if (booking.guestPlayer1Name) {
              players.push({
                name: booking.guestPlayer1Name,
                isGuest: true,
                isPrimary: false
              });
            }
            if (booking.guestPlayer2Name) {
              players.push({
                name: booking.guestPlayer2Name,
                isGuest: true,
                isPrimary: false
              });
            }
            if (booking.guestPlayer3Name) {
              players.push({
                name: booking.guestPlayer3Name,
                isGuest: true,
                isPrimary: false
              });
            }
            
            // Debug: Log final players array
            console.log(`Booking ${booking.id} has ${players.length} players:`, players.map(p => p.name));
            
            // Create a names string for backwards compatibility
            const playerNames = players.map(p => p.name).join(', ') || 'Booked';
            
            return {
              ...booking,
              players,
              playerNames
            };
          }));
          
          setBookings(bookingsWithPlayers);
        }
      } catch (err) {
        console.error('Error loading bookings:', err);
        setBookings([]);
      } finally {
        setIsLoadingBookings(false);
      }
    };
    
    loadBookings();
  }, [club?.id, selectedDate]);

  // Helper function to get booking for a specific court and time
  const getBookingForCourtAndTime = (courtId: string, time: string) => {
    return bookings.find(booking => {
      // Match by courtId if available, otherwise by courtNumber
      const courtMatch = booking.courtId === courtId || 
                        (courtId.includes('fallback-') && booking.courtNumber);
      
      if (!courtMatch) return false;
      
      // Check if time slot overlaps with booking
      const [bookingStartHour, bookingStartMin] = booking.startTime.split(':').map(Number);
      const [bookingEndHour, bookingEndMin] = booking.endTime.split(':').map(Number);
      const [slotHour, slotMin] = time.split(':').map(Number);
      
      const bookingStartMinutes = bookingStartHour * 60 + bookingStartMin;
      const bookingEndMinutes = bookingEndHour * 60 + bookingEndMin;
      const slotMinutes = slotHour * 60 + slotMin;
      
      return slotMinutes >= bookingStartMinutes && slotMinutes < bookingEndMinutes;
    });
  };
  
  // Helper function to get player names from booking
  const getBookingPlayerNames = (booking: any) => {
    return booking.playerNames || 'Booked';
  };

  // Helper function to check if all courts are booked for a specific time
  const areAllCourtsBooked = (time: string) => {
    if (displayCourts.length === 0) return false;
    
    // Check if every court has a booking at this time
    return displayCourts.every(court => {
      return getBookingForCourtAndTime(court.id, time) !== undefined;
    });
  };

  // Generate time slots based on club settings
  const generateTimeSlots = useCallback(() => {
    const slots: string[] = [];
    const [openHour, openMinute] = openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = closingTime.split(':').map(Number);
    
    const startMinutes = openHour * 60 + openMinute;
    const endMinutes = closeHour * 60 + closeMinute;
    
    // Ensure bookingSlotInterval is a number
    let interval: number;
    if (typeof bookingSlotInterval === 'number') {
      interval = bookingSlotInterval;
    } else if (typeof bookingSlotInterval === 'string') {
      interval = parseInt(bookingSlotInterval, 10);
    } else {
      interval = 60; // default
    }
    
    // Validate interval
    if (isNaN(interval) || interval <= 0) {
      console.warn('Invalid interval, using default 60:', interval, bookingSlotInterval);
      interval = 60; // fallback to 60 minutes
    }
    
    console.log('Time slot generation:', { openingTime, closingTime, bookingSlotInterval, interval, startMinutes, endMinutes });
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(time);
    }
    
    console.log('Generated time slots:', slots);
    return slots;
  }, [openingTime, closingTime, bookingSlotInterval]);

  const timeSlots = generateTimeSlots();

  // Generate date buttons (next 14 days)
  const generateDateButtons = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date.getDate();
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      dates.push({
        dateString,
        dayName,
        dayNumber,
        monthName,
        isToday: i === 0
      });
    }
    return dates;
  };

  const dateButtons = generateDateButtons();

  // Find the closest time to current time
  const findClosestTime = useCallback((slots: string[], dateString: string): string | null => {
    if (!slots || slots.length === 0) return null;
    
    const today = new Date();
    const selectedDate = new Date(dateString);
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (!isToday) {
      // For future dates, select the first time slot
      return slots[0];
    }
    
    // For today, find the closest time that hasn't passed
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Find the first time slot that is >= current time
    for (const time of slots) {
      const [hours, minutes] = time.split(':').map(Number);
      const timeMinutes = hours * 60 + minutes;
      
      if (timeMinutes >= currentMinutes) {
        return time;
      }
    }
    
    // If all times have passed, return the last time slot
    return slots[slots.length - 1];
  }, []);

  const handleDateChange = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedCourt(null);
    setSelectedDuration(null);
    
    // Auto-select the closest time
    const closestTime = findClosestTime(timeSlots, dateString);
    setSelectedTime(closestTime);
  };
  
  // Auto-select time when component loads or date changes
  useEffect(() => {
    if (selectedDate && timeSlots && timeSlots.length > 0 && !selectedTime) {
      const closestTime = findClosestTime(timeSlots, selectedDate);
      if (closestTime) {
        setSelectedTime(closestTime);
      }
    }
  }, [selectedDate, timeSlots, selectedTime, findClosestTime]);

  const handleBooking = () => {
    if (selectedCourt && selectedTime && selectedDate) {
      // TODO: Implement booking logic
      alert(`Booking Court ${selectedCourt} on ${selectedDate} at ${selectedTime}`);
    }
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: backgroundColor,
        color: fontColor,
        display: 'flex',
        flexDirection: 'column',
      } as React.CSSProperties}
    >
      <ClubHeader logo={logo} fontColor={fontColor} backgroundColor={backgroundColor} selectedColor={selectedColor} currentPath={`/club/${slug}`} />
      <div 
        className={styles.container} 
        style={{ 
          flex: 1,
          '--hover-color': hoverColor,
          '--selected-color': selectedColor,
        } as React.CSSProperties & { '--hover-color': string; '--selected-color': string }}
      >

        {/* Date Selection */}
        <div className={styles.dateSelection}>
          <div className={styles.dateButtonsContainer}>
            {/* Left Arrow */}
            {dateScrollIndex > 0 && (
              <button
                onClick={() => setDateScrollIndex(Math.max(0, dateScrollIndex - 1))}
                className={styles.scrollArrow}
                style={{ color: fontColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            )}
            
            {/* Date Buttons Container */}
            <div className={styles.dateButtonsGrid}>
              {dateButtons.slice(dateScrollIndex, dateScrollIndex + 7).map((date) => (
              <button
                key={date.dateString}
                onClick={() => handleDateChange(date.dateString)}
                className={`${styles.dateButton} ${selectedDate === date.dateString ? styles.dateButtonSelected : ''}`}
                style={{
                  backgroundColor: selectedDate === date.dateString ? selectedColor : undefined,
                  borderColor: selectedDate === date.dateString ? selectedColor : undefined,
                  color: selectedDate === date.dateString ? '#ffffff' : undefined,
                  borderRadius: '3px',
                  overflow: 'visible'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderRadius = '3px';
                  if (selectedDate !== date.dateString) {
                    e.currentTarget.style.setProperty('background-color', hoverColor, 'important');
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderRadius = '3px';
                  if (selectedDate !== date.dateString) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#052333';
                  }
                }}
              >
                {date.isToday ? (
                  <span>Today</span>
                ) : (
                  <>
                    <span>{date.dayName}</span>
                    <span style={{ fontWeight: 500 }}>{date.dayNumber}</span>
                    <span>{date.monthName}</span>
                  </>
                )}
              </button>
              ))}
            </div>
            
            {/* Right Arrow */}
            {dateScrollIndex + 7 < dateButtons.length && (
              <button
                onClick={() => setDateScrollIndex(Math.min(dateButtons.length - 7, dateScrollIndex + 1))}
                className={styles.scrollArrow}
                style={{ color: fontColor }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Time Selection - Show under date buttons */}
        {selectedDate && (
          <div className={styles.timeSelection}>
            <div className={styles.timeButtonsGrid}>
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`${styles.timeButton} ${selectedTime === time ? styles.timeButtonSelected : ''}`}
                  style={{
                    backgroundColor: selectedTime === time ? selectedColor : undefined,
                    borderColor: selectedTime === time ? selectedColor : undefined,
                    color: selectedTime === time ? '#ffffff' : undefined,
                    opacity: areAllCourtsBooked(time) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    const allBooked = areAllCourtsBooked(time);
                    e.currentTarget.style.opacity = allBooked ? '0.5' : '1';
                    if (selectedTime !== time) {
                      e.currentTarget.style.setProperty('background-color', hoverColor, 'important');
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    const allBooked = areAllCourtsBooked(time);
                    e.currentTarget.style.opacity = allBooked ? '0.5' : '1';
                    if (selectedTime !== time) {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = '#052333';
                    }
                  }}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Court Selection */}
        <div className={styles.courtSelection}>
          {isLoadingCourts ? (
            <div className={styles.openLoader}>
              <span
                className={`oa-open-o ${styles.openLoaderLetter}`}
                style={{ animationDelay: '0s' }}
              />
              <span
                className={`oa-open-p ${styles.openLoaderLetter}`}
                style={{ animationDelay: '0.15s' }}
              />
              <span
                className={`oa-open-e ${styles.openLoaderLetter}`}
                style={{ animationDelay: '0.3s' }}
              />
              <span
                className={`oa-open-n ${styles.openLoaderLetter}`}
                style={{ animationDelay: '0.45s' }}
              />
            </div>
          ) : displayCourts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: fontColor, opacity: 0.7 }}>
              No courts available
            </div>
          ) : (
            <div className={styles.courtButtonsGrid}>
              {displayCourts.map((court) => {
                const booking = selectedTime ? getBookingForCourtAndTime(court.id, selectedTime) : null;
                const isBooked = !!booking;
                const bookingNames = booking ? getBookingPlayerNames(booking) : null;
                
                return (
                <div 
                  key={court.id} 
                  className={styles.courtCard}
                  style={{
                    backgroundColor: isBooked ? selectedColor : '#ffffff',
                    border: isBooked ? `2px solid ${selectedColor}` : 'none',
                    borderRadius: '3px',
                    padding: '16px',
                    position: 'relative'
                  }}
                >
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: isBooked ? '#ffffff' : '#052333',
                    marginBottom: '8px',
                    textAlign: 'center'
                  }}>
                    {court.name}
                  </div>
                  
                  {/* Show booking status when court is booked */}
                  {isBooked && selectedTime && booking && (
                    <div 
                      onClick={() => {
                        if (booking.id) {
                          router.push(`/club/${slug}/booking/${booking.id}`);
                        }
                      }}
                      style={{
                        marginTop: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {(() => {
                        // Get players array, fallback to empty array if not available
                        const players = (booking.players && Array.isArray(booking.players)) 
                          ? booking.players 
                          : [];
                        const isSingles = players.length <= 2;
                        
                        // If no players array, show fallback text
                        if (players.length === 0) {
                          return (
                            <div style={{
                              padding: '8px 12px',
                              backgroundColor: selectedColor,
                              color: '#ffffff',
                              borderRadius: '4px',
                              fontSize: '14px',
                              fontWeight: '500',
                              textAlign: 'center'
                            }}>
                              {booking.playerNames || 'Booked'}
                            </div>
                          );
                        }
                        
                        // Arrange players: singles = 2 columns, doubles = 2x2 grid
                        return (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: isSingles ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
                            gap: '16px',
                            width: '100%',
                            maxWidth: isSingles ? '200px' : '100%'
                          }}>
                            {players.map((player, index) => (
                              <div
                                key={index}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                {/* Player Avatar Circle */}
                                <div style={{
                                  position: 'relative',
                                  width: '48px',
                                  height: '48px',
                                  borderRadius: '50%',
                                  backgroundColor: isBooked ? 'rgba(255, 255, 255, 0.2)' : '#052333',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#ffffff',
                                  fontSize: '18px',
                                  fontWeight: '600',
                                  border: player.isPrimary ? '2px solid #fbbf24' : 'none',
                                  boxShadow: player.isPrimary ? '0 0 0 2px rgba(251, 191, 36, 0.3)' : 'none'
                                }}>
                                  {player.name.charAt(0).toUpperCase()}
                                  {/* Gold tag for primary player */}
                                  {player.isPrimary && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '-4px',
                                      right: '-4px',
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: '#fbbf24',
                                      border: '2px solid #ffffff',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      color: '#052333'
                                    }}>
                                      {/* You can add a number here if needed, like "0.3" or "0.1" */}
                                    </div>
                                  )}
                                </div>
                                {/* Player Name */}
                                <div style={{
                                  fontSize: '12px',
                                  color: isBooked ? '#ffffff' : '#052333',
                                  textAlign: 'center',
                                  maxWidth: '80px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: '500'
                                }}>
                                  {player.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Duration Selection - Show buttons if logged in and court is not booked, show tennis court icon if not logged in */}
                  {!authLoading && user ? (
                    !isBooked && validSessionDuration && validSessionDuration.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                          {validSessionDuration.map((duration) => (
                            <button
                              key={duration}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Always navigate to player selection with booking details
                                const params = new URLSearchParams({
                                  courtId: court.id,
                                  court: court.name, // Keep for backwards compatibility
                                  date: selectedDate,
                                  duration: duration.toString()
                                });
                                // Add time if selected
                                if (selectedTime) {
                                  params.set('time', selectedTime);
                                }
                                router.push(`/club/${slug}/players?${params.toString()}`);
                              }}
                              className={`${styles.durationButton} ${selectedCourt === court.id && selectedDuration === duration ? styles.durationButtonSelected : ''}`}
                              style={{
                                backgroundColor: actionColor,
                                color: '#ffffff',
                                border: `2px solid ${actionColor}`,
                                borderRadius: '3px',
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              {duration} min
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: '12px', color: '#052333', opacity: 0.8 }}>Available: Singles & Doubles</div>
                      </div>
                    )
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                      <i className="oa-tennis-court" style={{ fontSize: '48px', color: fontColor, opacity: 0.6, display: 'inline-block' }}></i>
                      <div style={{ fontSize: '12px', color: '#052333', opacity: 0.8 }}>Available: Singles & Doubles</div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Original court display code - keeping for backwards compatibility */}
        {selectedDate && !selectedTime && (
          <div className={styles.courtSelection}>
            {isLoadingCourts ? (
              <div className={styles.openLoader}>
                <span
                  className={`oa-open-o ${styles.openLoaderLetter}`}
                  style={{ animationDelay: '0s' }}
                />
                <span
                  className={`oa-open-p ${styles.openLoaderLetter}`}
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className={`oa-open-e ${styles.openLoaderLetter}`}
                  style={{ animationDelay: '0.3s' }}
                />
                <span
                  className={`oa-open-n ${styles.openLoaderLetter}`}
                  style={{ animationDelay: '0.45s' }}
                />
              </div>
            ) : displayCourts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: fontColor, opacity: 0.7 }}>
                No courts available
              </div>
            ) : (
              <div className={styles.courtButtonsGrid}>
                {displayCourts.map((court) => (
                  <div 
                    key={court.id} 
                    className={styles.courtCard}
                    style={{
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '16px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#052333',
                      marginBottom: '8px',
                      textAlign: 'center'
                    }}>
                      {court.name}
                    </div>
                    
                    {/* Duration Selection - Show buttons if logged in, show tennis court icon if not logged in */}
                    {!authLoading && user ? (
                      validSessionDuration && validSessionDuration.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                            {validSessionDuration.map((duration) => (
                              <button
                                key={duration}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Always navigate to player selection with booking details
                                  const params = new URLSearchParams({
                                    courtId: court.id,
                                    court: court.name, // Keep for backwards compatibility
                                    date: selectedDate,
                                    duration: duration.toString()
                                  });
                                  // Add time if selected
                                  if (selectedTime) {
                                    params.set('time', selectedTime);
                                  }
                                  router.push(`/club/${slug}/players?${params.toString()}`);
                                }}
                                className={`${styles.durationButton} ${selectedCourt === court.id && selectedDuration === duration ? styles.durationButtonSelected : ''}`}
                                style={{
                                  backgroundColor: selectedColor,
                                  color: '#ffffff',
                                  border: `2px solid ${selectedColor}`,
                                  borderRadius: '6px',
                                  padding: '8px 16px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  opacity: selectedCourt === court.id && selectedDuration === duration ? 1 : 0.7
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!(selectedCourt === court.id && selectedDuration === duration)) {
                                    e.currentTarget.style.opacity = '0.7';
                                  }
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                {duration} min
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎾</div>
                        <div style={{ fontSize: '14px' }}>Login to book</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <ClubFooter fontColor={fontColor} />
    </div>
  );
}
