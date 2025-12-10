'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseClientClient } from '@/lib/supabase';
import { generateSlug } from '@/lib/slug-utils';
import { ClubAnimationProvider } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';

interface Club {
  id: string;
  name: string;
  backgroundColor?: string;
  fontColor?: string;
  selectedColor?: string;
  hoverColor?: string;
}

interface Player {
  id?: string;
  name: string;
  isGuest?: boolean;
  isPrimary?: boolean;
}

interface Booking {
  id: string;
  clubId: string;
  userId: string;
  courtNumber: number;
  courtName?: string;
  bookingDate: string;
  startTime: string;
  duration: number;
  endTime: string;
  bookingType: 'singles' | 'doubles';
  player1Id?: string;
  player2Id?: string;
  player3Id?: string;
  player4Id?: string;
  guestPlayer1Name?: string;
  guestPlayer2Name?: string;
  guestPlayer3Name?: string;
  status: string;
  players?: Player[];
}

function BookingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;
  const bookingId = params.id as string;

  const [club, setClub] = useState<Club | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [hoverColor, setHoverColor] = useState('#f0f0f0');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Team organization state
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  
  // Score state
  const [scores, setScores] = useState<{ teamA: number[]; teamB: number[] }>({
    teamA: [],
    teamB: []
  });

  // Format date for display
  const formattedDate = useMemo(() => {
    if (!booking?.bookingDate) return null;
    const d = new Date(booking.bookingDate);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      full: d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })
    };
  }, [booking]);

  // Format time for display
  const formattedTime = useMemo(() => {
    if (!booking?.startTime) return '';
    const [hours, minutes] = booking.startTime.split(':');
    return `${hours}:${minutes}`;
  }, [booking]);

  // Load club and booking data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Validate bookingId format (should be UUID)
        if (!bookingId || typeof bookingId !== 'string' || bookingId.trim() === '') {
          setError('Invalid booking ID');
          setIsLoading(false);
          return;
        }

        const supabase = getSupabaseClientClient();

        // Load club - fetch all clubs and find by slug (since Clubs table doesn't have slug column)
        const { data: clubsData, error: clubsError } = await supabase
          .from('Clubs')
          .select('*')
          .eq('is_active', true);

        if (clubsError) {
          console.error('Club query error:', {
            error: clubsError,
            message: clubsError.message,
            details: clubsError.details,
            hint: clubsError.hint,
            code: clubsError.code
          });
          throw new Error(clubsError.message || `Failed to load club: ${clubsError.code || 'Unknown error'}`);
        }

        if (!clubsData || clubsData.length === 0) {
          setError('No clubs found');
          setIsLoading(false);
          return;
        }

        // Find club by matching slug
        const clubData = clubsData.find((c) => generateSlug(c.name) === slug);

        if (!clubData) {
          setError(`Club not found for slug: "${slug}"`);
          setIsLoading(false);
          return;
        }

        setClub(clubData);
        setBackgroundColor(clubData.backgroundColor || '#052333');
        setFontColor(clubData.fontColor || '#ffffff');
        setSelectedColor(clubData.selectedColor || '#667eea');
        setHoverColor(clubData.hoverColor || '#f0f0f0');
        setLogo(clubData.logo);

        // Load booking
        const { data: bookingData, error: bookingError } = await supabase
          .from('Bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();

        if (bookingError) {
          console.error('Booking query error:', {
            error: bookingError,
            message: bookingError.message,
            details: bookingError.details,
            hint: bookingError.hint,
            code: bookingError.code
          });
          throw new Error(bookingError.message || `Failed to load booking: ${bookingError.code || 'Unknown error'}`);
        }
        if (!bookingData) {
          setError('Booking not found');
          setIsLoading(false);
          return;
        }

        // Validate required fields
        if (!bookingData.clubId || !bookingData.courtNumber) {
          console.error('Booking missing required fields:', bookingData);
          setError('Booking data is incomplete');
          setIsLoading(false);
          return;
        }

        // Load court name - match by name (e.g., "Court 1") since Courts table uses name, not courtNumber
        let courtName = `Court ${bookingData.courtNumber}`;
        try {
          const { data: courtData, error: courtError } = await supabase
            .from('Courts')
            .select('name')
            .eq('clubId', bookingData.clubId)
            .eq('name', `Court ${bookingData.courtNumber}`)
            .maybeSingle();

          if (!courtError && courtData?.name) {
            courtName = courtData.name;
          }
        } catch (courtErr) {
          // If Courts table doesn't exist or query fails, use fallback name
          console.warn('Could not load court name:', courtErr);
        }

        const bookingWithCourt: Booking = {
          ...bookingData,
          courtName: courtName
        };

        // Load players
        const playerIds = [
          bookingData.player1Id,
          bookingData.player2Id,
          bookingData.player3Id,
          bookingData.player4Id
        ].filter(Boolean) as string[];

        let players: Player[] = [];

        if (playerIds.length > 0) {
          const { data: playersData, error: playersError } = await supabase
            .from('Users')
            .select('id, Firstname, Surname')
            .in('id', playerIds);

          if (playersError) {
            console.warn('Error loading players:', playersError);
          }

          if (playersData) {
            const playersMap = new Map(playersData.map(p => [p.id, p]));
            
            [bookingData.player1Id, bookingData.player2Id, bookingData.player3Id, bookingData.player4Id].forEach((playerId, index) => {
              if (playerId) {
                const playerData = playersMap.get(playerId);
                if (playerData) {
                  const name = `${playerData.Firstname || ''} ${playerData.Surname || ''}`.trim();
                  if (name) {
                    players.push({
                      id: playerId,
                      name,
                      isGuest: false,
                      isPrimary: index === 0 || playerId === bookingData.userId
                    });
                  }
                }
              }
            });
          }
        }

        // Add guest players
        if (bookingData.guestPlayer1Name) {
          players.push({
            name: bookingData.guestPlayer1Name,
            isGuest: true,
            isPrimary: false
          });
        }
        if (bookingData.guestPlayer2Name) {
          players.push({
            name: bookingData.guestPlayer2Name,
            isGuest: true,
            isPrimary: false
          });
        }
        if (bookingData.guestPlayer3Name) {
          players.push({
            name: bookingData.guestPlayer3Name,
            isGuest: true,
            isPrimary: false
          });
        }

        bookingWithCourt.players = players;

        // Load existing match result if available
        const { data: matchResultData } = await supabase
          .from('MatchResults')
          .select('*')
          .eq('bookingId', bookingId)
          .maybeSingle();

        // Organize players into teams (use match result if available, otherwise use booking order)
        if (matchResultData) {
          // Reconstruct teams from match result
          const teamAFromResult: Player[] = [];
          const teamBFromResult: Player[] = [];

          // Team A players
          if (matchResultData.teamAPlayer1Id) {
            const player = players.find(p => p.id === matchResultData.teamAPlayer1Id);
            if (player) teamAFromResult.push(player);
          } else if (matchResultData.teamAGuest1Name) {
            teamAFromResult.push({ name: matchResultData.teamAGuest1Name, isGuest: true });
          }
          if (matchResultData.teamAPlayer2Id) {
            const player = players.find(p => p.id === matchResultData.teamAPlayer2Id);
            if (player) teamAFromResult.push(player);
          } else if (matchResultData.teamAGuest2Name) {
            teamAFromResult.push({ name: matchResultData.teamAGuest2Name, isGuest: true });
          }

          // Team B players
          if (matchResultData.teamBPlayer1Id) {
            const player = players.find(p => p.id === matchResultData.teamBPlayer1Id);
            if (player) teamBFromResult.push(player);
          } else if (matchResultData.teamBGuest1Name) {
            teamBFromResult.push({ name: matchResultData.teamBGuest1Name, isGuest: true });
          }
          if (matchResultData.teamBPlayer2Id) {
            const player = players.find(p => p.id === matchResultData.teamBPlayer2Id);
            if (player) teamBFromResult.push(player);
          } else if (matchResultData.teamBGuest2Name) {
            teamBFromResult.push({ name: matchResultData.teamBGuest2Name, isGuest: true });
          }

          // If we have teams from match result, use them
          if (teamAFromResult.length > 0 || teamBFromResult.length > 0) {
            setTeamA(teamAFromResult);
            setTeamB(teamBFromResult);
          } else {
            // Fallback to booking order
            if (bookingData.bookingType === 'doubles' && players.length >= 4) {
              setTeamA([players[0], players[1]]);
              setTeamB([players[2], players[3]]);
            } else if (bookingData.bookingType === 'singles' && players.length >= 2) {
              setTeamA([players[0]]);
              setTeamB([players[1]]);
            } else {
              const mid = Math.ceil(players.length / 2);
              setTeamA(players.slice(0, mid));
              setTeamB(players.slice(mid));
            }
          }

          // Load scores from match result
          if (matchResultData.teamAScores && matchResultData.teamBScores) {
            setScores({
              teamA: Array.isArray(matchResultData.teamAScores) ? matchResultData.teamAScores : [],
              teamB: Array.isArray(matchResultData.teamBScores) ? matchResultData.teamBScores : []
            });
          }
        } else {
          // No match result, use booking order
          if (bookingData.bookingType === 'doubles' && players.length >= 4) {
            setTeamA([players[0], players[1]]);
            setTeamB([players[2], players[3]]);
          } else if (bookingData.bookingType === 'singles' && players.length >= 2) {
            setTeamA([players[0]]);
            setTeamB([players[1]]);
          } else {
            // Fallback: distribute evenly
            const mid = Math.ceil(players.length / 2);
            setTeamA(players.slice(0, mid));
            setTeamB(players.slice(mid));
          }
        }

        setBooking(bookingWithCourt);
      } catch (err: unknown) {
        // Extract error message from various possible error formats
        let errorMessage = 'Failed to load booking';
        let errorDetails: any = null;
        
        if (err) {
          if (typeof err === 'string') {
            errorMessage = err;
          } else if (err instanceof Error) {
            errorMessage = err.message || 'An error occurred';
            errorDetails = {
              name: err.name,
              stack: err.stack
            };
          } else if (typeof err === 'object') {
            const errObj = err as any;
            errorMessage = errObj.message || 
                          errObj.error?.message || 
                          errObj.details || 
                          errObj.hint || 
                          'An error occurred';
            errorDetails = {
              code: errObj.code,
              details: errObj.details,
              hint: errObj.hint,
              message: errObj.message
            };
          } else {
            errorMessage = String(err) || 'Unknown error occurred';
          }
        }
        
        console.error('Error loading booking data:', {
          errorMessage,
          errorDetails,
          errorType: err instanceof Error ? 'Error' : typeof err,
          error: err
        });
        
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug && bookingId) {
      loadData();
    }
  }, [slug, bookingId, router]);

  // Swap players between teams
  const swapPlayer = (fromTeam: 'A' | 'B', playerIndex: number) => {
    if (fromTeam === 'A') {
      const player = teamA[playerIndex];
      const newTeamA = teamA.filter((_, i) => i !== playerIndex);
      const newTeamB = [...teamB, player];
      setTeamA(newTeamA);
      setTeamB(newTeamB);
    } else {
      const player = teamB[playerIndex];
      const newTeamB = teamB.filter((_, i) => i !== playerIndex);
      const newTeamA = [...teamA, player];
      setTeamA(newTeamA);
      setTeamB(newTeamB);
    }
  };

  // Swap entire teams
  const swapTeams = () => {
    const temp = teamA;
    setTeamA(teamB);
    setTeamB(temp);
  };

  // Handle score input
  const handleScoreChange = (team: 'A' | 'B', setIndex: number, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    setScores(prev => {
      const newScores = { ...prev };
      const teamScores = [...(newScores[team === 'A' ? 'teamA' : 'teamB'])];
      
      // Ensure array is long enough
      while (teamScores.length <= setIndex) {
        teamScores.push(0);
      }
      
      teamScores[setIndex] = numValue;
      
      if (team === 'A') {
        newScores.teamA = teamScores;
      } else {
        newScores.teamB = teamScores;
      }
      
      return newScores;
    });
  };

  // Add new set
  const addSet = () => {
    setScores(prev => ({
      teamA: [...prev.teamA, 0],
      teamB: [...prev.teamB, 0]
    }));
  };

  // Submit result
  const handleSubmitResult = async () => {
    if (!booking || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      const supabase = getSupabaseClientClient();

      // Update booking with new team assignments
      const updateData: any = {};

      // Update player positions based on teams
      const allPlayers = [...teamA, ...teamB];
      if (allPlayers.length >= 1 && allPlayers[0].id) updateData.player1Id = allPlayers[0].id;
      if (allPlayers.length >= 2 && allPlayers[1].id) updateData.player2Id = allPlayers[1].id;
      if (allPlayers.length >= 3 && allPlayers[2].id) updateData.player3Id = allPlayers[2].id;
      if (allPlayers.length >= 4 && allPlayers[3].id) updateData.player4Id = allPlayers[3].id;

      // Update booking with new team assignments
      const { error: updateError } = await supabase
        .from('Bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (updateError) throw updateError;

      // Store scores in MatchResults table if scores were entered
      if (scores.teamA.length > 0 || scores.teamB.length > 0) {
        // Prepare team player data
        const teamAPlayers = teamA.map(p => ({ id: p.id, name: p.name, isGuest: p.isGuest }));
        const teamBPlayers = teamB.map(p => ({ id: p.id, name: p.name, isGuest: p.isGuest }));

        // Prepare match result data
        const matchResultData: any = {
          bookingId: bookingId,
          clubId: booking.clubId,
          submittedBy: user.id,
          teamAScores: scores.teamA,
          teamBScores: scores.teamB,
          matchDate: booking.bookingDate,
          matchTime: booking.startTime,
          duration: booking.duration
        };

        // Add team A players
        if (teamAPlayers.length > 0 && teamAPlayers[0].id && !teamAPlayers[0].isGuest) {
          matchResultData.teamAPlayer1Id = teamAPlayers[0].id;
        } else if (teamAPlayers.length > 0) {
          matchResultData.teamAGuest1Name = teamAPlayers[0].name;
        }
        if (teamAPlayers.length > 1 && teamAPlayers[1].id && !teamAPlayers[1].isGuest) {
          matchResultData.teamAPlayer2Id = teamAPlayers[1].id;
        } else if (teamAPlayers.length > 1) {
          matchResultData.teamAGuest2Name = teamAPlayers[1].name;
        }

        // Add team B players
        if (teamBPlayers.length > 0 && teamBPlayers[0].id && !teamBPlayers[0].isGuest) {
          matchResultData.teamBPlayer1Id = teamBPlayers[0].id;
        } else if (teamBPlayers.length > 0) {
          matchResultData.teamBGuest1Name = teamBPlayers[0].name;
        }
        if (teamBPlayers.length > 1 && teamBPlayers[1].id && !teamBPlayers[1].isGuest) {
          matchResultData.teamBPlayer2Id = teamBPlayers[1].id;
        } else if (teamBPlayers.length > 1) {
          matchResultData.teamBGuest2Name = teamBPlayers[1].name;
        }

        // Upsert match result (insert or update if exists)
        const { error: matchResultError } = await supabase
          .from('MatchResults')
          .upsert(matchResultData, {
            onConflict: 'bookingId',
            ignoreDuplicates: false
          });

        if (matchResultError) {
          console.error('Error saving match result:', matchResultError);
          // Don't throw - booking update succeeded, match result is secondary
        }
      }

      // Navigate back to club page
      router.push(`/club/${slug}`);
    } catch (err: any) {
      console.error('Error submitting result:', err);
      setError(err.message || 'Failed to submit result');
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

  if (error && !booking) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor, color: fontColor, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div>{error}</div>
        <button
          onClick={() => router.push(`/club/${slug}`)}
          style={{
            padding: '12px 24px',
            backgroundColor: selectedColor,
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Back to Club
        </button>
      </div>
    );
  }

  if (!booking || !club) return null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor, color: fontColor }}>
      <ClubHeader 
        logo={logo} 
        fontColor={fontColor} 
        backgroundColor={backgroundColor}
        selectedColor={selectedColor}
        currentPath={`/club/${slug}/booking/${bookingId}`}
      />

      <div style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => router.back()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${fontColor}`,
              borderRadius: '6px',
              color: fontColor,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <span>←</span>
            <span>Back</span>
          </button>
          <button
            onClick={() => {
              // Share functionality
              if (navigator.share) {
                navigator.share({
                  title: `Booking: ${booking.courtName}`,
                  text: `Tennis booking on ${formattedDate?.full} at ${formattedTime}`,
                  url: window.location.href
                });
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#10b981',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <span>💬</span>
            <span>SHARE</span>
          </button>
        </div>

        {/* Booking Details Card */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Booking Info */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#052333', marginBottom: '8px' }}>
              {booking.courtName}
            </div>
            <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>
              {formattedDate?.full}
            </div>
            <div style={{ fontSize: '16px', color: '#666' }}>
              {formattedTime} for {booking.duration}min
            </div>
          </div>

          {/* Teams */}
          <div style={{ marginBottom: '32px' }}>
            {/* Team A */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#052333', marginBottom: '12px' }}>
                Team A
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamA.map((player, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#052333',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '600',
                        border: player.isPrimary ? '2px solid #fbbf24' : 'none'
                      }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: '#052333', fontSize: '16px' }}>{player.name}</span>
                      {player.isGuest && (
                        <span style={{ fontSize: '12px', color: '#666', backgroundColor: '#e5e5e5', padding: '2px 8px', borderRadius: '4px' }}>
                          Guest
                        </span>
                      )}
                    </div>
                    {booking.bookingType === 'doubles' && (
                      <button
                        onClick={() => swapPlayer('A', index)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: selectedColor,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Move to Team B
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Swap Teams Button */}
            {booking.bookingType === 'doubles' && (
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button
                  onClick={swapTeams}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f5f5f5',
                    color: '#052333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <span>⇅</span>
                  <span>Change game order</span>
                </button>
              </div>
            )}

            {/* Team B */}
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#052333', marginBottom: '12px' }}>
                Team B
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teamB.map((player, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#052333',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '600',
                        border: player.isPrimary ? '2px solid #fbbf24' : 'none'
                      }}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: '#052333', fontSize: '16px' }}>{player.name}</span>
                      {player.isGuest && (
                        <span style={{ fontSize: '12px', color: '#666', backgroundColor: '#e5e5e5', padding: '2px 8px', borderRadius: '4px' }}>
                          Guest
                        </span>
                      )}
                    </div>
                    {booking.bookingType === 'doubles' && (
                      <button
                        onClick={() => swapPlayer('B', index)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: selectedColor,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Move to Team A
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score Entry */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#052333', marginBottom: '16px' }}>
              Match Scores
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: Math.max(scores.teamA.length, scores.teamB.length, 1) }).map((_, setIndex) => (
                <div key={setIndex} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#052333', fontSize: '14px', minWidth: '60px' }}>Set {setIndex + 1}:</span>
                    <input
                      type="number"
                      min="0"
                      value={scores.teamA[setIndex] || ''}
                      onChange={(e) => handleScoreChange('A', setIndex, e.target.value)}
                      placeholder="0"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '16px',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ color: '#052333', fontSize: '16px' }}>-</span>
                    <input
                      type="number"
                      min="0"
                      value={scores.teamB[setIndex] || ''}
                      onChange={(e) => handleScoreChange('B', setIndex, e.target.value)}
                      placeholder="0"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '16px',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addSet}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f5f5f5',
                  color: '#052333',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  alignSelf: 'flex-start'
                }}
              >
                + Add Set
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmitResult}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px 24px',
              backgroundColor: isSubmitting ? '#ccc' : selectedColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit result'}
          </button>
        </div>
      </div>

      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <ClubAnimationProvider>
      <BookingDetailContent />
    </ClubAnimationProvider>
  );
}

