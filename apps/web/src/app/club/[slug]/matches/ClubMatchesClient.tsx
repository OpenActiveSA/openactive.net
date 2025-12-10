'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import ClubNotifications from '@/components/club/ClubNotifications';
import OpenActiveLoader from '@/components/OpenActiveLoader';
import type { ClubSettings } from '@/lib/club-settings';

interface Player {
  id?: string;
  name: string;
  isGuest?: boolean;
  isPrimary?: boolean;
}

interface Booking {
  id: string;
  clubId: string;
  clubName?: string;
  clubSlug?: string;
  courtNumber: number;
  courtName?: string;
  bookingDate: string;
  startTime: string;
  duration: number;
  bookingType: 'singles' | 'doubles';
  status: string;
  userId?: string;
  players?: Player[];
  hasGuest?: boolean;
}

interface MatchResult {
  id: string;
  bookingId: string;
  teamAScores: number[];
  teamBScores: number[];
  matchDate: string;
  matchTime: string;
  booking?: Booking;
}

interface ClubMatchesClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ClubMatchesContent({ slug, clubSettings }: ClubMatchesClientProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { contentVisible } = useClubAnimation();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setIsLoadingData(false);
        return;
      }

      try {
        const supabase = getSupabaseClientClient();

        // Load all user's bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('Bookings')
          .select(`
            id,
            clubId,
            courtNumber,
            bookingDate,
            startTime,
            duration,
            bookingType,
            status,
            userId,
            player1Id,
            player2Id,
            player3Id,
            player4Id,
            guestPlayer1Name,
            guestPlayer2Name,
            guestPlayer3Name
          `)
          .or(`userId.eq.${user.id},player1Id.eq.${user.id},player2Id.eq.${user.id},player3Id.eq.${user.id},player4Id.eq.${user.id}`)
          .order('bookingDate', { ascending: false })
          .order('startTime', { ascending: false });

        if (bookingsError) {
          console.error('Error loading bookings:', bookingsError);
        }

        // Declare processedBookings outside the if block so it's accessible later
        let processedBookings: Booking[] = [];

        if (bookingsData) {
          // Load club names and court names
          const clubIds = [...new Set(bookingsData.map(b => b.clubId))];
          const { data: clubsData } = await supabase
            .from('Clubs')
            .select('id, name')
            .in('id', clubIds);

          const clubsMap = new Map(clubsData?.map(c => [c.id, c.name]) || []);
          const clubsSlugMap = new Map(clubsData?.map(c => [c.id, generateSlug(c.name)]) || []);

          // Load player data for all bookings
          const allPlayerIds = bookingsData.flatMap(b => [
            b.player1Id,
            b.player2Id,
            b.player3Id,
            b.player4Id
          ]).filter(Boolean) as string[];

          let playersMap = new Map();
          if (allPlayerIds.length > 0) {
            const { data: playersData } = await supabase
              .from('Users')
              .select('id, Firstname, Surname')
              .in('id', allPlayerIds);

            if (playersData) {
              playersMap = new Map(playersData.map(p => [
                p.id,
                `${p.Firstname || ''} ${p.Surname || ''}`.trim()
              ]));
            }
          }

          // Process bookings with players
          processedBookings = await Promise.all(bookingsData.map(async (booking) => {
            const players: Player[] = [];
            let hasGuest = false;

            // Add registered players
            [booking.player1Id, booking.player2Id, booking.player3Id, booking.player4Id].forEach((playerId, index) => {
              if (playerId) {
                const name = playersMap.get(playerId);
                if (name) {
                  players.push({
                    id: playerId,
                    name,
                    isGuest: false,
                    isPrimary: index === 0 || playerId === booking.userId
                  });
                }
              }
            });

            // Add guest players
            if (booking.guestPlayer1Name) {
              players.push({ name: booking.guestPlayer1Name, isGuest: true });
              hasGuest = true;
            }
            if (booking.guestPlayer2Name) {
              players.push({ name: booking.guestPlayer2Name, isGuest: true });
              hasGuest = true;
            }
            if (booking.guestPlayer3Name) {
              players.push({ name: booking.guestPlayer3Name, isGuest: true });
              hasGuest = true;
            }

            // Get court name
            let courtName = `Court ${booking.courtNumber}`;
            try {
              const { data: courtData } = await supabase
                .from('Courts')
                .select('name')
                .eq('clubId', booking.clubId)
                .eq('name', `Court ${booking.courtNumber}`)
                .maybeSingle();
              
              if (courtData?.name) {
                courtName = courtData.name;
              }
            } catch (err) {
              // Ignore court name errors
            }

            return {
              ...booking,
              clubName: clubsMap.get(booking.clubId),
              clubSlug: clubsSlugMap.get(booking.clubId),
              courtName,
              players,
              hasGuest
            };
          }));

          setBookings(processedBookings);
        }

        // Load match results
        const { data: resultsData, error: resultsError } = await supabase
          .from('MatchResults')
          .select('id, bookingId, teamAScores, teamBScores, matchDate, matchTime')
          .eq('submittedBy', user.id)
          .order('matchDate', { ascending: false })
          .order('matchTime', { ascending: false });

        if (resultsError) {
          console.error('Error loading match results:', resultsError);
        }

        // Match results with their bookings
        const resultsWithBookings = (resultsData || []).map(result => {
          const booking = processedBookings.find(b => b.id === result.bookingId);
          return {
            ...result,
            booking
          };
        }).filter(r => r.booking) as MatchResult[];

        // Also add past bookings without results to Score Cards section
        const pastBookingsWithoutResults = processedBookings.filter(booking => {
          const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
          const isPast = bookingDateTime < new Date();
          const hasResult = (resultsData || []).some(r => r.bookingId === booking.id);
          return isPast && !hasResult && booking.status !== 'cancelled';
        });

        // Add these as "pending result" entries
        const pendingResults: MatchResult[] = pastBookingsWithoutResults.map(booking => ({
          id: `pending-${booking.id}`,
          bookingId: booking.id,
          teamAScores: [],
          teamBScores: [],
          matchDate: booking.bookingDate,
          matchTime: booking.startTime,
          booking
        }));

        // Combine results and pending results
        setMatchResults([...resultsWithBookings, ...pendingResults]);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (user?.id) {
      loadData();
    } else {
      setIsLoadingData(false);
    }
  }, [user?.id]);

  // Separate active and past bookings
  const { activeBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    const active: Booking[] = [];
    const past: Booking[] = [];

    bookings.forEach(booking => {
      const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const isPast = bookingDateTime < now || booking.status === 'cancelled' || booking.status === 'completed';
      
      if (isPast) {
        past.push(booking);
      } else {
        active.push(booking);
      }
    });

    return { activeBookings: active, pastBookings: past };
  }, [bookings]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      weekday: date.toLocaleDateString('en-US', { weekday: 'long' }),
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' })
    };
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  // Handle cancel booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const supabase = getSupabaseClientClient();
      const { error } = await supabase
        .from('Bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      // Reload bookings
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status: 'cancelled' } : b
      ));
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  // Handle delete match result
  const handleDeleteResult = async (resultId: string) => {
    if (!confirm('Are you sure you want to delete this match result?')) return;

    // If it's a pending result (starts with "pending-"), just remove it from state
    if (resultId.startsWith('pending-')) {
      setMatchResults(prev => prev.filter(r => r.id !== resultId));
      return;
    }

    try {
      const supabase = getSupabaseClientClient();
      const { error } = await supabase
        .from('MatchResults')
        .delete()
        .eq('id', resultId);

      if (error) throw error;

      setMatchResults(prev => prev.filter(r => r.id !== resultId));
    } catch (err: any) {
      console.error('Error deleting result:', err);
      alert('Failed to delete match result. Please try again.');
    }
  };

  return (
    <ProtectedRoute>
      <style>{`
        @media (min-width: 768px) {
          .matches-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (min-width: 1024px) {
          .matches-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
      `}</style>
      <div style={{ minHeight: '100vh', backgroundColor: clubSettings.backgroundColor, color: clubSettings.fontColor, display: 'flex', flexDirection: 'column' }}>
        <ClubHeader 
          logo={clubSettings.logo}
          fontColor={clubSettings.fontColor} 
          backgroundColor={clubSettings.backgroundColor}
          selectedColor={clubSettings.selectedColor}
          currentPath={`/club/${slug}/matches`}
        />
        <ClubNotifications clubId={clubSettings.id} fontColor={clubSettings.fontColor} />

        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '24px', 
          flex: 1,
          opacity: contentVisible ? 1 : 0,
          transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {isLoadingData ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '60px 20px',
              gap: '16px'
            }}>
              <OpenActiveLoader fontColor={clubSettings.fontColor} size={48} />
            </div>
          ) : (
            <>
          {/* Manage matches section */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: clubSettings.fontColor,
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            Manage matches
          </h2>

          <div className="matches-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr',
            gap: '16px', 
            marginBottom: '48px'
          }}>
            {/* Active bookings */}
            {activeBookings.map(booking => {
              const date = formatDate(booking.bookingDate);
              const time = formatTime(booking.startTime);
              const isActive = booking.status !== 'cancelled' && booking.status !== 'completed';

              return (
                <div
                  key={booking.id}
                  style={{
                    backgroundColor: isActive ? clubSettings.selectedColor : '#9ca3af',
                    borderRadius: '3px',
                    padding: '20px',
                    position: 'relative',
                    color: '#ffffff'
                  }}
                >
                  {/* Edit button */}
                  <button
                    onClick={() => {
                      if (booking.clubSlug) {
                        router.push(`/club/${booking.clubSlug}/booking/${booking.id}`);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '8px',
                      cursor: 'pointer',
                      color: '#ffffff',
                      fontSize: '18px'
                    }}
                  >
                    ✏️
                  </button>

                  {/* Booking info */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                      {booking.courtName}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>
                      {date.weekday} {date.day} {date.month} {time} for {booking.duration}min
                    </div>
                  </div>

                  {/* Players */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: booking.bookingType === 'doubles' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    {booking.players?.map((player, index) => (
                      <div key={index} style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          border: player.isPrimary ? '2px solid #fbbf24' : 'none',
                          margin: '0 auto 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '18px',
                          fontWeight: '600',
                          position: 'relative'
                        }}>
                          {player.name.charAt(0).toUpperCase()}
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
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              8.3
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {player.name}
                          {player.isGuest && (
                            <div style={{ fontSize: '10px', opacity: 0.8 }}>Guest</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {booking.hasGuest && isActive && (
                      <button
                        style={{
                          backgroundColor: '#14b8a6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Pay for guest
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      style={{
                        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      ✕ Cancel booking
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Past bookings */}
            {pastBookings.map(booking => {
              const date = formatDate(booking.bookingDate);
              const time = formatTime(booking.startTime);

              return (
                <div
                  key={booking.id}
                  style={{
                    backgroundColor: '#9ca3af',
                    borderRadius: '3px',
                    padding: '20px',
                    position: 'relative',
                    color: '#ffffff',
                    opacity: 0.7
                  }}
                >
                  {/* Edit button */}
                  <button
                    onClick={() => {
                      if (booking.clubSlug) {
                        router.push(`/club/${booking.clubSlug}/booking/${booking.id}`);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: 'none',
                      borderRadius: '3px',
                      padding: '8px',
                      cursor: 'pointer',
                      color: '#ffffff',
                      fontSize: '18px'
                    }}
                  >
                    ✏️
                  </button>

                  {/* Booking info */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                      {booking.courtName}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>
                      {date.weekday} {date.day} {date.month} {time} for {booking.duration}min
                    </div>
                  </div>

                  {/* Players */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: booking.bookingType === 'doubles' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    {booking.players?.map((player, index) => (
                      <div key={index} style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          border: player.isPrimary ? '2px solid #fbbf24' : 'none',
                          margin: '0 auto 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontSize: '18px',
                          fontWeight: '600',
                          position: 'relative'
                        }}>
                          {player.name.charAt(0).toUpperCase()}
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
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              8.3
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {player.name}
                          {player.isGuest && (
                            <div style={{ fontSize: '10px', opacity: 0.8 }}>Guest</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cancel button */}
                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ✕ Cancel booking
                  </button>
                </div>
              );
            })}

            {!isLoadingData && bookings.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '48px',
                color: clubSettings.fontColor,
                fontSize: '16px',
                opacity: 0.8
              }}>
                No bookings found
              </div>
            )}
          </div>

          {/* Score Cards section */}
          <div style={{ borderTop: `1px solid ${clubSettings.fontColor}33`, paddingTop: '32px' }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: clubSettings.fontColor,
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              Score Cards
            </h2>

            <div className="matches-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr',
              gap: '16px'
            }}>
              {matchResults.map(result => {
                const date = formatDate(result.matchDate);
                const time = formatTime(result.matchTime);
                const booking = result.booking;

                if (!booking) return null;

                return (
                  <div
                    key={result.id}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '3px',
                      padding: '20px',
                      position: 'relative',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    {/* Delete button - only show for actual results, not pending ones */}
                    {!result.id.startsWith('pending-') && (
                      <button
                        onClick={() => handleDeleteResult(result.id)}
                        style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: '#666'
                        }}
                      >
                        🗑️
                      </button>
                    )}

                    {/* Match info */}
                    <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '600', color: '#052333', marginBottom: '4px' }}>
                        {booking.courtName}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {date.weekday} {date.day} {date.month} {time} for {booking.duration}min
                      </div>
                    </div>

                    {/* Players */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: booking.bookingType === 'doubles' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                      gap: '12px',
                      marginBottom: '16px'
                    }}>
                      {booking.players?.map((player, index) => (
                        <div key={index} style={{ textAlign: 'center' }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#052333',
                            border: player.isPrimary ? '2px solid #fbbf24' : 'none',
                            margin: '0 auto 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '18px',
                            fontWeight: '600',
                            position: 'relative'
                          }}>
                            {player.name.charAt(0).toUpperCase()}
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
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                8.3
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#052333' }}>
                            {player.name}
                            {player.isGuest && (
                              <div style={{ fontSize: '10px', color: '#666' }}>Guest</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Scores */}
                    {result.teamAScores.length > 0 && result.teamBScores.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '24px',
                        marginTop: '16px'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Team 1</div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#052333' }}>
                            {result.teamAScores.map((score, i) => (
                              <span key={i} style={{
                                marginRight: '8px',
                                fontWeight: score === Math.max(...result.teamAScores) ? '700' : '400',
                                color: score === Math.max(...result.teamAScores) ? '#052333' : '#9ca3af'
                              }}>
                                {score}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Team 2</div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#052333' }}>
                            {result.teamBScores.map((score, i) => (
                              <span key={i} style={{
                                marginRight: '8px',
                                fontWeight: score === Math.max(...result.teamBScores) ? '700' : '400',
                                color: score === Math.max(...result.teamBScores) ? '#052333' : '#9ca3af'
                              }}>
                                {score}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (booking.clubSlug) {
                            router.push(`/club/${booking.clubSlug}/booking/${booking.id}`);
                          }
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: clubSettings.selectedColor,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          marginTop: '16px'
                        }}
                      >
                        Add result
                      </button>
                    )}
                  </div>
                );
              })}

              {!isLoadingData && matchResults.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '48px',
                  color: clubSettings.fontColor,
                  fontSize: '16px',
                  opacity: 0.8
                }}>
                  No score cards yet
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>

        <ClubFooter fontColor={clubSettings.fontColor} />
      </div>
    </ProtectedRoute>
  );
}

export default function ClubMatchesClient(props: ClubMatchesClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubMatchesContent {...props} />
    </ClubAnimationProvider>
  );
}

