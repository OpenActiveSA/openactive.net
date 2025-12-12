'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { getClubCourts, SPORT_TYPE_LABELS, type Court } from '@/lib/courts';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import { getUserClubRole, type ClubRole } from '@/lib/club-roles';
import { logError, logWarning, logDebug } from '@/lib/error-utils';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import ClubNotifications from '@/components/club/ClubNotifications';
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
  membersBookingDays: number;
  visitorBookingDays: number;
  coachBookingDays: number;
  clubManagerBookingDays: number;
}

function ClubPageContent({ club, slug, logo, backgroundColor, fontColor, selectedColor, actionColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration, membersBookingDays, visitorBookingDays, coachBookingDays, clubManagerBookingDays }: ClubPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { contentVisible } = useClubAnimation();
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
        logError('ClubPageClient', err, { clubId: club.id, action: 'loadCourts' });
        setCourts([]);
      } finally {
        setIsLoadingCourts(false);
      }
    };
    
    loadCourts();
  }, [club?.id]);

  // Load schedule rules for the club
  useEffect(() => {
    const loadScheduleRules = async () => {
      if (!club?.id) return;

      try {
        const supabase = getSupabaseClientClient();
        const { data: rulesData, error: rulesError } = await supabase
          .from('ScheduleRules')
          .select('*')
          .eq('clubId', club.id)
          .eq('status', 'active')
          .order('createdAt', { ascending: false });

        if (rulesError) {
          // If table doesn't exist, that's okay - rules will be empty
          if (rulesError.code === '42P01' || rulesError.message?.includes('does not exist') || rulesError.message?.includes('relation') || rulesError.message?.includes('table')) {
            return;
          }
          logWarning('ClubPageClient', 'Error loading schedule rules', { error: rulesError });
          return;
        }

        if (rulesData) {
          // Log raw data from database for debugging
          console.log('[ClubPageClient] 📦 Raw rules data from database:', rulesData.map((r: any) => ({
            id: r.id,
            name: r.name,
            disabledDates: r.disabledDates,
            disabled_dates: r.disabled_dates,
            hasDisabledDates: !!r.disabledDates,
            hasDisabled_dates: !!r.disabled_dates
          })));
          
          const mappedRules = rulesData.map((rule: any) => {
            // Ensure recurringDays are numbers
            let recurringDays = rule.recurringDays || rule.recurring_days || [];
            if (Array.isArray(recurringDays) && recurringDays.length > 0) {
              recurringDays = recurringDays.map((d: any) => typeof d === 'string' ? parseInt(d, 10) : d);
            }
            
            const disabledDates = (() => {
              const dates = rule.disabledDates || rule.disabled_dates || [];
              // Ensure all dates are strings in YYYY-MM-DD format
              return Array.isArray(dates) ? dates.map((d: any) => String(d).trim()) : [];
            })();
            
            return {
              id: rule.id,
              name: rule.name || '',
              courts: Array.isArray(rule.courts) ? rule.courts.map((c: any) => typeof c === 'string' ? parseInt(c, 10) : c) : [],
              startDate: rule.startDate || rule.start_date || '',
              endDate: rule.endDate || rule.end_date || '',
              startTime: rule.startTime || rule.start_time || '00:00',
              endTime: rule.endTime || rule.end_time || '23:59',
              recurring: rule.recurring || 'none',
              recurringDays: recurringDays,
              disabledDates: disabledDates,
              status: rule.status || 'active',
              setting: rule.setting || 'blocked'
            };
          });
          logDebug('ClubPageClient', 'Loaded schedule rules', { rules: mappedRules });
          
          // Log rules with disabled dates for debugging
          const rulesWithDisabledDates = mappedRules.filter(r => r.disabledDates && r.disabledDates.length > 0);
          if (rulesWithDisabledDates.length > 0) {
            console.log('[ClubPageClient] ✅ Loaded rules with disabled dates:', rulesWithDisabledDates.map(r => ({
              id: r.id,
              name: r.name,
              disabledDates: r.disabledDates,
              disabledDatesCount: r.disabledDates.length
            })));
          } else {
            console.log('[ClubPageClient] ⚠️ No rules with disabled dates found. Total rules:', mappedRules.length);
          }
          
          setScheduleRules(mappedRules);
        }
      } catch (err) {
        logError('ClubPageClient', err, { clubId: club.id, action: 'loadScheduleRules' });
      }
    };

    if (club?.id) {
      loadScheduleRules();
    }
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
  
  logDebug('ClubPageClient', 'Received props', { 
    hoverColor, 
    actionColor,
    bookingSlotInterval, 
    openingTime, 
    closingTime,
    selectedColor,
    sessionDuration: validSessionDuration,
    courtsCount: displayCourts.length
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
  const dateScrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Load bookings for the selected date
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  
  // User role and booking restrictions
  const [userRole, setUserRole] = useState<ClubRole | 'SUPER_ADMIN' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userHasBookingForTimeSlot, setUserHasBookingForTimeSlot] = useState(false);
  const [isLoadingUserRole, setIsLoadingUserRole] = useState(false);
  const [scheduleRules, setScheduleRules] = useState<Array<{
    id: string;
    name: string;
    courts: number[];
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    recurring: 'none' | 'daily' | 'weekly';
    recurringDays?: number[];
    disabledDates?: string[];
    status: 'active' | 'pause';
    setting: string;
  }>>([]);
  
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
          logError('ClubPageClient', error, { clubId: club.id, selectedDate, action: 'loadBookings' });
          setBookings([]);
        } else {
          // Fetch player data separately
          const bookingsWithPlayers = await Promise.all((data || []).map(async (booking) => {
            const players: Array<{ id?: string; name: string; isGuest: boolean; isPrimary: boolean }> = [];
            
            // Debug: Log the booking to see what we're working with
            logDebug('ClubPageClient', 'Processing booking', {
              id: booking.id,
              player1Id: booking.player1Id,
              player2Id: booking.player2Id,
              player3Id: booking.player3Id,
              player4Id: booking.player4Id,
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
                logError('ClubPageClient', playersError, { bookingId: booking.id, action: 'fetchPlayers' });
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
                        logWarning('ClubPageClient', `Player ${playerId} has no name`, { playerId, Firstname: playerData.Firstname, Surname: playerData.Surname });
                      }
                    } else {
                      logWarning('ClubPageClient', `Player ${playerId} not found in database`, { playerId });
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
            logDebug('ClubPageClient', `Booking ${booking.id} has ${players.length} players`, { bookingId: booking.id, playerCount: players.length, playerNames: players.map(p => p.name) });
            
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
        logError('ClubPageClient', err, { clubId: club.id, selectedDate, action: 'loadBookings' });
        setBookings([]);
      } finally {
        setIsLoadingBookings(false);
      }
    };
    
    loadBookings();
  }, [club?.id, selectedDate]);

  // Load user role and check if they have a booking for the selected time slot
  useEffect(() => {
    const loadUserRoleAndBookingStatus = async () => {
      if (!user?.id || !club?.id || authLoading) {
        setUserRole(null);
        setIsSuperAdmin(false);
        setUserHasBookingForTimeSlot(false);
        setIsLoadingUserRole(false);
        return;
      }

      setIsLoadingUserRole(true);
      try {
        const supabase = getSupabaseClientClient();
        
        // Check if user is SUPER_ADMIN (global role in Users table)
        const { data: userData, error: userError } = await supabase
          .from('Users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!userError && userData?.role === 'SUPER_ADMIN') {
          setIsSuperAdmin(true);
          setUserRole('SUPER_ADMIN');
          setUserHasBookingForTimeSlot(false); // Super admins can always book
          setIsLoadingUserRole(false);
          return;
        }

        // Get user's club role
        const clubRole = await getUserClubRole(supabase, user.id, club.id);
        setUserRole(clubRole);
        setIsSuperAdmin(false);

        // If user is CLUB_ADMIN, they can book multiple courts
        if (clubRole === 'CLUB_ADMIN') {
          setUserHasBookingForTimeSlot(false);
          setIsLoadingUserRole(false);
          return;
        }

        // For VISITOR and MEMBER, check if they have a booking for the selected date/time
        if (selectedDate && selectedTime && (clubRole === 'VISITOR' || clubRole === 'MEMBER')) {
          // Check if user has any booking for this date/time slot
          const { data: userBookings, error: bookingError } = await supabase
            .from('Bookings')
            .select('id, startTime, endTime')
            .eq('clubId', club.id)
            .eq('bookingDate', selectedDate)
            .in('status', ['pending', 'confirmed'])
            .or(`userId.eq.${user.id},player1Id.eq.${user.id},player2Id.eq.${user.id},player3Id.eq.${user.id},player4Id.eq.${user.id}`);

          if (!bookingError && userBookings && userBookings.length > 0) {
            // Check if any booking overlaps with the selected time
            const [selectedHour, selectedMin] = selectedTime.split(':').map(Number);
            const selectedMinutes = selectedHour * 60 + selectedMin;

            const hasOverlap = userBookings.some((booking: any) => {
              const [startHour, startMin] = booking.startTime.split(':').map(Number);
              const [endHour, endMin] = booking.endTime.split(':').map(Number);
              const startMinutes = startHour * 60 + startMin;
              const endMinutes = endHour * 60 + endMin;

              // Check if selected time is within the booking time range
              return selectedMinutes >= startMinutes && selectedMinutes < endMinutes;
            });

            setUserHasBookingForTimeSlot(hasOverlap);
          } else {
            setUserHasBookingForTimeSlot(false);
          }
        } else {
          setUserHasBookingForTimeSlot(false);
        }
      } catch (err) {
        console.error('Error loading user role and booking status:', err);
        setUserRole(null);
        setIsSuperAdmin(false);
        setUserHasBookingForTimeSlot(false);
      } finally {
        setIsLoadingUserRole(false);
      }
    };

    loadUserRoleAndBookingStatus();
  }, [user?.id, club?.id, selectedDate, selectedTime, authLoading]);

  // Helper function to get booking for a specific court and time
  // Check if a court is blocked by a schedule rule
  const getScheduleRuleForCourt = useCallback((court: Court, date: string, time: string): typeof scheduleRules[0] | null => {
    if (!date || !time || scheduleRules.length === 0) {
      logDebug('ClubPageClient', 'getScheduleRuleForCourt - early return', {
        hasDate: !!date,
        hasTime: !!time,
        rulesCount: scheduleRules.length
      });
      return null;
    }

    // Extract court number from court name (e.g., "Court 1" -> 1)
    const courtNumberMatch = court.name.match(/\d+/);
    const courtNumber = courtNumberMatch ? parseInt(courtNumberMatch[0], 10) : 0;
    if (courtNumber === 0) {
      logDebug('ClubPageClient', 'getScheduleRuleForCourt - no court number', { courtName: court.name });
      return null;
    }

    // Parse the date - use local timezone to avoid UTC issues
    // Date string is in YYYY-MM-DD format
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    const selectedDayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (Friday = 5)
    const [timeHours, timeMinutes] = time.split(':').map(Number);
    const selectedTimeMinutes = timeHours * 60 + timeMinutes;

    logDebug('ClubPageClient', 'getScheduleRuleForCourt - checking', {
      courtNumber,
      date,
      selectedDayOfWeek,
      dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDayOfWeek],
      time,
      selectedTimeMinutes,
      rulesCount: scheduleRules.length,
      rulesWithDisabledDates: scheduleRules.filter(r => r.disabledDates && r.disabledDates.length > 0).map(r => ({
        id: r.id,
        name: r.name,
        disabledDates: r.disabledDates
      }))
    });

    // Check each active schedule rule
    for (const rule of scheduleRules) {
      if (rule.status !== 'active') {
        logDebug('ClubPageClient', 'Rule not active', { ruleName: rule.name, status: rule.status });
        continue;
      }
      
      // Check if this rule applies to this court
      if (!rule.courts.includes(courtNumber)) {
        logDebug('ClubPageClient', 'Rule does not apply to court', {
          ruleName: rule.name,
          ruleCourts: rule.courts,
          courtNumber
        });
        continue;
      }

      // Parse rule date range - use local timezone
      const [startYear, startMonth, startDay] = rule.startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = rule.endDate.split('-').map(Number);
      const ruleStartDate = new Date(startYear, startMonth - 1, startDay);
      const ruleEndDate = new Date(endYear, endMonth - 1, endDay);
      ruleEndDate.setHours(23, 59, 59, 999); // Include the entire end date

      // Check if selected date is within rule date range
      if (selectedDate < ruleStartDate || selectedDate > ruleEndDate) {
        logDebug('ClubPageClient', 'Date not in range', {
          ruleName: rule.name,
          selectedDate: selectedDate.toISOString().split('T')[0],
          ruleStartDate: ruleStartDate.toISOString().split('T')[0],
          ruleEndDate: ruleEndDate.toISOString().split('T')[0]
        });
        continue;
      }

      // Parse rule time range
      const [ruleStartHours, ruleStartMinutes] = rule.startTime.split(':').map(Number);
      const [ruleEndHours, ruleEndMinutes] = rule.endTime.split(':').map(Number);
      const ruleStartTimeMinutes = ruleStartHours * 60 + ruleStartMinutes;
      const ruleEndTimeMinutes = ruleEndHours * 60 + ruleEndMinutes;

      logDebug('ClubPageClient', 'Checking rule time and recurring', {
        ruleName: rule.name,
        recurring: rule.recurring,
        recurringDays: rule.recurringDays,
        ruleStartTime: rule.startTime,
        ruleEndTime: rule.endTime,
        selectedTimeMinutes,
        ruleStartTimeMinutes,
        ruleEndTimeMinutes
      });

      // Check recurring pattern
      if (rule.recurring === 'none') {
        // One-time rule: check if date and time match
        if (selectedTimeMinutes >= ruleStartTimeMinutes && selectedTimeMinutes < ruleEndTimeMinutes) {
          logDebug('ClubPageClient', 'Court blocked by one-time rule', { ruleName: rule.name });
          return rule;
        }
      } else if (rule.recurring === 'daily') {
        // Daily rule: check if time matches
        const disabledDates = rule.disabledDates || [];
        // Normalize date string to ensure format matches (YYYY-MM-DD)
        const selectedDateStr = String(date).trim();
        
        logDebug('ClubPageClient', 'Checking daily rule', {
          ruleName: rule.name,
          selectedDateStr,
          disabledDates: disabledDates,
          disabledDatesCount: disabledDates.length,
          isDateDisabled: disabledDates.includes(selectedDateStr)
        });
        
        // Check if this specific date is disabled (normalize all dates for comparison)
        const normalizedDisabledDates = disabledDates.map((d: string) => String(d).trim());
        if (normalizedDisabledDates.includes(selectedDateStr)) {
          logDebug('ClubPageClient', 'Date is disabled for daily rule - skipping', { 
            ruleName: rule.name, 
            selectedDate: selectedDateStr,
            disabledDates: disabledDates,
            normalizedDisabledDates: normalizedDisabledDates
          });
          continue;
        }
        
        if (selectedTimeMinutes >= ruleStartTimeMinutes && selectedTimeMinutes < ruleEndTimeMinutes) {
          logDebug('ClubPageClient', 'Court blocked by daily rule', { ruleName: rule.name });
          return rule;
        }
      } else if (rule.recurring === 'weekly') {
        // Weekly rule: check if day of week matches and time matches
        const ruleDays = rule.recurringDays || [];
        const disabledDates = rule.disabledDates || [];
        // Normalize date string to ensure format matches (YYYY-MM-DD)
        const selectedDateStr = String(date).trim();
        
        // Check if this specific date is disabled (normalize all dates for comparison)
        const normalizedDisabledDates = disabledDates.map((d: string) => String(d).trim());
        const isDateDisabled = normalizedDisabledDates.includes(selectedDateStr);
        
        // IMPORTANT: Check disabled dates FIRST, before any other checks
        console.log('[ClubPageClient] 🔍 Checking disabled dates for rule:', rule.name, {
          selectedDate: selectedDateStr,
          disabledDates: disabledDates,
          normalizedDisabledDates: normalizedDisabledDates,
          isDateDisabled: isDateDisabled,
          comparison: `Looking for "${selectedDateStr}" in [${normalizedDisabledDates.map(d => `"${d}"`).join(', ')}]`
        });
        
        if (isDateDisabled) {
          console.log('[ClubPageClient] ⚠️ Date is DISABLED for weekly rule - SKIPPING', { 
            ruleName: rule.name, 
            selectedDate: selectedDateStr,
            disabledDates: disabledDates,
            normalizedDisabledDates: normalizedDisabledDates
          });
          continue;
        }
        
        logDebug('ClubPageClient', 'Checking weekly rule', {
          ruleName: rule.name,
          ruleDays,
          selectedDayOfWeek,
          selectedDateStr,
          disabledDates: disabledDates,
          normalizedDisabledDates: normalizedDisabledDates,
          disabledDatesCount: disabledDates.length,
          isDateDisabled: isDateDisabled,
          dayMatches: ruleDays.includes(selectedDayOfWeek),
          timeMatches: selectedTimeMinutes >= ruleStartTimeMinutes && selectedTimeMinutes < ruleEndTimeMinutes
        });
        
        if (ruleDays.includes(selectedDayOfWeek) && 
            selectedTimeMinutes >= ruleStartTimeMinutes && 
            selectedTimeMinutes < ruleEndTimeMinutes) {
          logDebug('ClubPageClient', 'Court blocked by weekly rule', { ruleName: rule.name });
          return rule;
        }
      }
    }

    logDebug('ClubPageClient', 'Court not blocked', { courtNumber, date, time });
    return null;
  }, [scheduleRules]);

  // Helper function to get availability text based on rule setting
  const getAvailabilityText = (setting: string): string => {
    const settingMap: Record<string, string> = {
      'blocked': 'Blocked',
      'blocked-coaching': 'Blocked for Coaching',
      'blocked-tournament': 'Blocked for Tournament',
      'blocked-maintenance': 'Blocked for Maintenance',
      'blocked-social': 'Blocked for Social',
      'members-only': 'Members Only',
      'members-only-bookings': 'Members Only Bookings',
      'open-doubles-singles': 'Available: Singles & Doubles',
      'doubles-only': 'Available: Doubles Only',
      'singles-only': 'Available: Singles Only'
    };
    return settingMap[setting] || 'Available: Singles & Doubles';
  };

  const getBookingForCourtAndTime = (courtId: string, time: string) => {
    // Find the court object to get its name
    const court = displayCourts.find(c => c.id === courtId);
    const courtName = court?.name || '';
    
    // Extract court number from court name (e.g., "Court 1" -> 1, "Court 2" -> 2)
    const courtNumberFromName = courtName ? parseInt(courtName.replace(/\D/g, '')) || null : null;
    
    return bookings.find(booking => {
      // Match by courtId if available
      if (booking.courtId === courtId) {
        // Time check will be done below
      }
      // Match by courtNumber if courtId doesn't match or is missing
      else if (courtNumberFromName && booking.courtNumber === courtNumberFromName) {
        // Time check will be done below
      }
      // Match fallback courts by courtNumber
      else if (courtId.includes('fallback-') && booking.courtNumber) {
        // Extract number from fallback ID (e.g., "fallback-1" -> 1)
        const fallbackNumber = parseInt(courtId.replace(/\D/g, '')) || null;
        if (fallbackNumber !== booking.courtNumber) {
          return false;
        }
      }
      else {
        return false;
      }
      
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
      logWarning('ClubPageClient', 'Invalid interval, using default 60', { interval, bookingSlotInterval });
      interval = 60; // fallback to 60 minutes
    }
    
    logDebug('ClubPageClient', 'Time slot generation', { openingTime, closingTime, bookingSlotInterval, interval, startMinutes, endMinutes });
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(time);
    }
    
    logDebug('ClubPageClient', 'Generated time slots', { slotCount: slots.length, slots });
    return slots;
  }, [openingTime, closingTime, bookingSlotInterval]);

  const timeSlots = generateTimeSlots();

  // Determine the maximum booking days based on user role
  const maxBookingDays = useMemo(() => {
    if (!user || !userRole) {
      // Not logged in - use visitor setting
      return visitorBookingDays;
    }
    
    if (isSuperAdmin || userRole === 'CLUB_ADMIN') {
      // Super Admin and Club Manager use clubManagerBookingDays
      return clubManagerBookingDays;
    }
    
    if (userRole === 'COACH') {
      return coachBookingDays;
    }
    
    if (userRole === 'MEMBER') {
      return membersBookingDays;
    }
    
    // Default to visitor for VISITOR role or unknown roles
    return visitorBookingDays;
  }, [user, userRole, isSuperAdmin, membersBookingDays, visitorBookingDays, coachBookingDays, clubManagerBookingDays]);

  // Generate date buttons based on user's booking days limit
  const generateDateButtons = useCallback(() => {
    const dates = [];
    const today = new Date();
    // Use maxBookingDays + 1 to include today (day 0)
    const totalDays = maxBookingDays + 1;
    for (let i = 0; i < totalDays; i++) {
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
  }, [maxBookingDays]);

  const dateButtons = useMemo(() => {
    const buttons = generateDateButtons();
    logDebug('ClubPageClient', 'Date buttons generated', {
      count: buttons.length,
      maxBookingDays,
      userRole,
      isSuperAdmin,
      buttonDates: buttons.map(b => b.dateString)
    });
    return buttons;
  }, [generateDateButtons, maxBookingDays, userRole, isSuperAdmin]);


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
      <ClubNotifications clubId={club?.id || null} fontColor={fontColor} />
      <div 
        className={styles.container} 
        style={{ 
          flex: 1,
          '--hover-color': hoverColor,
          '--selected-color': selectedColor,
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
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
            
            {/* Date Buttons Container - Fixed width viewport */}
            <div className={styles.dateButtonsViewport}>
              <div 
                ref={dateScrollContainerRef}
                className={styles.dateButtonsGrid}
                style={{
                  /* Calculate transform relative to viewport: each page is 100% of viewport, so slide by (100% / totalPages) * dateScrollIndex of grid width */
                  transform: `translateX(calc(-${dateScrollIndex} * (100% / ${Math.ceil(dateButtons.length / 7)})))`,
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: `calc(100% * ${Math.ceil(dateButtons.length / 7)})`, /* Dynamic width: each page is 100% of viewport, so total is pages * 100% */
                  '--total-pages': Math.ceil(dateButtons.length / 7) /* CSS variable for button width calculation */
                } as React.CSSProperties & { '--total-pages': number }}
              >
                {/* Debug: Show total buttons count */}
                {process.env.NODE_ENV === 'development' && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '-30px', 
                    left: 0, 
                    fontSize: '12px', 
                    color: fontColor, 
                    opacity: 0.7,
                    zIndex: 1000,
                    pointerEvents: 'none'
                  }}>
                    Total buttons: {dateButtons.length}, Pages: {Math.ceil(dateButtons.length / 7)}, Current page: {dateScrollIndex + 1}, Max booking days: {maxBookingDays}
                  </div>
                )}
                {dateButtons.map((date) => (
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
            </div>
            
            {/* Right Arrow */}
            {dateScrollIndex < Math.ceil(dateButtons.length / 7) - 1 && (
              <button
                onClick={() => setDateScrollIndex(Math.min(Math.ceil(dateButtons.length / 7) - 1, dateScrollIndex + 1))}
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
          {isLoadingCourts || (selectedTime && isLoadingBookings) || (selectedTime && user && isLoadingUserRole) ? (
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
                const rule = selectedDate && selectedTime ? getScheduleRuleForCourt(court, selectedDate, selectedTime) : null;
                const hasRule = !!rule;
                const shouldHighlight = isBooked || hasRule;
                
                return (
                <div 
                  key={court.id} 
                  className={styles.courtCard}
                  style={{
                    backgroundColor: shouldHighlight ? selectedColor : '#ffffff',
                    border: 'none'
                  }}
                >
                  <div 
                    className={styles.courtCardName}
                    style={{ 
                      color: shouldHighlight ? '#ffffff' : '#052333'
                    }}
                  >
                    {court.name}
                  </div>
                  
                  {/* Show booking status when court is booked */}
                  {isBooked && selectedTime && booking && (
                    <div 
                      className={styles.courtCardBookingContainer}
                      onClick={() => {
                        if (booking.id) {
                          router.push(`/club/${slug}/booking/${booking.id}`);
                        }
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
                            <div 
                              className={styles.courtCardBookedText}
                              style={{
                                backgroundColor: selectedColor,
                                color: '#ffffff'
                              }}
                            >
                              {booking.playerNames || 'Booked'}
                            </div>
                          );
                        }
                        
                        // Arrange players: singles = 2 columns, doubles = 2x2 grid
                        return (
                          <div 
                            className={styles.courtCardPlayersGrid}
                            style={{
                              maxWidth: isSingles ? '200px' : '100%'
                            }}
                          >
                            {players.map((player: { id?: string; name: string; isGuest: boolean; isPrimary: boolean }, index: number) => (
                              <div
                                key={index}
                                className={styles.courtCardPlayerItem}
                              >
                                {/* Player Avatar Circle */}
                                <div 
                                  className={styles.courtCardPlayerAvatar}
                                  style={{
                                    backgroundColor: isBooked ? 'rgba(255, 255, 255, 0.2)' : '#052333',
                                    border: player.isPrimary ? '2px solid #fbbf24' : 'none',
                                    boxShadow: player.isPrimary ? '0 0 0 2px rgba(251, 191, 36, 0.3)' : 'none'
                                  }}
                                >
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
                                <div 
                                  className={styles.courtCardPlayerName}
                                  style={{
                                    color: shouldHighlight ? '#ffffff' : '#052333'
                                  }}
                                >
                                  {player.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Duration Selection - Show buttons if logged in and court is not booked, show tennis court icon if not logged in or if visitor/member has booking or if blocked by schedule rule */}
                  {!authLoading && user ? (
                    !isBooked && validSessionDuration && validSessionDuration.length > 0 ? (
                      (() => {
                        if (rule) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                              <i className="oa-tennis-court" style={{ fontSize: '48px', color: '#ffffff', opacity: 0.9, display: 'inline-block' }}></i>
                              <div style={{ fontSize: '12px', color: '#ffffff', opacity: 0.8 }}>
                                {rule.name || 'Rule Active'}
                              </div>
                            </div>
                          );
                        }
                        // Check if user is visitor/member and has a booking for this time slot
                        // If so, show court icon instead of duration buttons
                        if (userHasBookingForTimeSlot && (userRole === 'VISITOR' || userRole === 'MEMBER')) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                              <i className="oa-tennis-court" style={{ fontSize: '48px', color: fontColor, opacity: 0.6, display: 'inline-block' }}></i>
                              <div style={{ fontSize: '12px', color: '#052333', opacity: 0.8 }}>Available: Singles & Doubles</div>
                            </div>
                          );
                        }
                        return (
                          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
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
                        );
                      })()
                    ) : null
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
            {isLoadingCourts || isLoadingBookings ? (
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
                  const rule = selectedDate && selectedTime ? getScheduleRuleForCourt(court, selectedDate, selectedTime) : null;
                  const hasRule = !!rule;
                  
                  return (
                  <div 
                    key={court.id} 
                    className={styles.courtCard}
                    style={{
                      backgroundColor: hasRule ? selectedColor : '#ffffff',
                      border: 'none'
                    }}
                  >
                    <div 
                      className={styles.courtCardName}
                      style={{ 
                        color: hasRule ? '#ffffff' : '#052333'
                      }}
                    >
                      {court.name}
                    </div>
                    
                    {/* Duration Selection - Show buttons if logged in, show tennis court icon if not logged in or if blocked by schedule rule */}
                    {!authLoading && user ? (
                      validSessionDuration && validSessionDuration.length > 0 ? (
                        (() => {
                          if (rule) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                                <i className="oa-tennis-court" style={{ fontSize: '48px', color: '#ffffff', opacity: 0.9, display: 'inline-block' }}></i>
                                <div style={{ fontSize: '12px', color: '#ffffff', opacity: 0.8 }}>
                                  {rule.name || 'Rule Active'}
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
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
                              <div style={{ fontSize: '12px', color: '#052333', opacity: 0.8 }}>Available: Singles & Doubles</div>
                            </div>
                          );
                        })()
                      ) : null
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        <i className="oa-tennis-court" style={{ fontSize: '48px', color: fontColor, opacity: 0.6, display: 'inline-block', marginBottom: '8px' }}></i>
                        <div style={{ fontSize: '14px' }}>Login to book</div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

export default function ClubPageClient(props: ClubPageClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubPageContent {...props} />
    </ClubAnimationProvider>
  );
}
