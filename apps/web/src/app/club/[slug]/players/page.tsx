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

export default function PlayerSelectionPage() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [club, setClub] = useState<Club | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#052333');
  const [fontColor, setFontColor] = useState('#ffffff');
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [hoverColor, setHoverColor] = useState('#f0f0f0');
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  // Player selection state
  const [bookingType, setBookingType] = useState<'singles' | 'doubles' | 'coaching'>('singles');
  const [selectedPlayers, setSelectedPlayers] = useState<Array<{ id: string; name: string; email: string } | null>>([null, null, null, null]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState<string>('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState<number | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string; email: string }>>([]);
  
  // Get booking details from URL params
  const court = searchParams.get('court');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const duration = searchParams.get('duration');
  
  // Format date for display
  const formattedDate = useMemo(() => {
    if (!date) return '';
    const d = new Date(date);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' })
    };
  }, [date]);
  
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowPlayerDropdown(null);
    };
    if (showPlayerDropdown !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showPlayerDropdown]);
  
  // Load current user as first player
  useEffect(() => {
    if (user && user.id) {
      const supabase = getSupabaseClientClient();
      supabase
        .from('Users')
        .select('id, Firstname, Surname, email')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const name = data.Firstname && data.Surname 
              ? `${data.Firstname} ${data.Surname}`
              : data.Firstname || data.Surname || data.email?.split('@')[0] || 'User';
            setSelectedPlayers([{ id: data.id, name, email: data.email || '' }, null, null, null]);
          }
        });
    }
  }, [user]);
  
  // Load available players for search
  useEffect(() => {
    const loadPlayers = async () => {
      if (!club?.id) return;
      try {
        const supabase = getSupabaseClientClient();
        const { data } = await supabase
          .from('Users')
          .select('id, Firstname, Surname, email')
          .order('Firstname', { ascending: true })
          .limit(100);
        
        if (data) {
          const players = data.map(u => ({
            id: u.id,
            name: u.Firstname && u.Surname 
              ? `${u.Firstname} ${u.Surname}`
              : u.Firstname || u.Surname || u.email?.split('@')[0] || 'User',
            email: u.email || ''
          }));
          setAvailablePlayers(players);
          // For now, all users can be coaches. Later you can filter by role if needed
          setCoaches(players);
        }
      } catch (err) {
        console.error('Error loading players:', err);
      }
    };
    
    loadPlayers();
  }, [club?.id]);
  
  // Filter players based on search term
  const filteredPlayers = useMemo(() => {
    if (!playerSearchTerm.trim()) return availablePlayers.slice(0, 10);
    const term = playerSearchTerm.toLowerCase();
    return availablePlayers
      .filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.email.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [availablePlayers, playerSearchTerm]);
  
  const handleSelectPlayer = (playerIndex: number, player: { id: string; name: string; email: string } | null) => {
    const newPlayers = [...selectedPlayers];
    newPlayers[playerIndex] = player;
    setSelectedPlayers(newPlayers);
    setShowPlayerDropdown(null);
    setPlayerSearchTerm('');
  };
  
  const handleAddGuest = (playerIndex: number) => {
    const newPlayers = [...selectedPlayers];
    newPlayers[playerIndex] = { id: 'guest', name: 'Guest', email: '' };
    setSelectedPlayers(newPlayers);
    setShowPlayerDropdown(null);
  };
  
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: fontColor }}>Loading...</div>
      </div>
    );
  }
  
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
      <ClubHeader logo={logo} fontColor={fontColor} backgroundColor={backgroundColor} selectedColor={selectedColor} currentPath={`/club/${slug}/players`} />
      <div className={styles.container} style={{ flex: 1 }}>
        <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '30px', color: fontColor, textAlign: 'center' }}>
            Select players
          </h1>
          
          {/* Booking Summary Card */}
          {court && date && duration && (
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.15)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '30px',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              borderLeft: `3px solid ${selectedColor}`,
              borderRight: `3px solid ${selectedColor}`
            }}>
              <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>
                {typeof formattedDate === 'object' && formattedDate !== null && (
                  <>
                    <div style={{ fontSize: '14px', color: fontColor, opacity: 0.8, marginBottom: '4px' }}>
                      {formattedDate.weekday}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: fontColor }}>
                      {formattedDate.day} {formattedDate.month}
                    </div>
                  </>
                )}
              </div>
              {time && (
                <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <div style={{ fontSize: '14px', color: fontColor, opacity: 0.8, marginBottom: '4px' }}>
                    Start
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: fontColor }}>
                    {time}
                  </div>
                </div>
              )}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '14px', color: fontColor, opacity: 0.8, marginBottom: '4px' }}>
                  Court {court}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: fontColor }}>
                  {duration} min
                </div>
              </div>
            </div>
          )}
          
          {/* Game Type Selection */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', justifyContent: 'center' }}>
            <button
              onClick={() => setBookingType('singles')}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: bookingType === 'singles' ? selectedColor : '#ffffff',
                color: bookingType === 'singles' ? '#ffffff' : '#052333',
                border: `2px solid ${bookingType === 'singles' ? selectedColor : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span>👤</span>
              <span>Singles</span>
            </button>
            <button
              onClick={() => setBookingType('doubles')}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: bookingType === 'doubles' ? selectedColor : '#ffffff',
                color: bookingType === 'doubles' ? '#ffffff' : '#052333',
                border: `2px solid ${bookingType === 'doubles' ? selectedColor : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span>👥</span>
              <span>Doubles</span>
            </button>
            <button
              onClick={() => setBookingType('coaching')}
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: bookingType === 'coaching' ? selectedColor : '#ffffff',
                color: bookingType === 'coaching' ? '#ffffff' : '#052333',
                border: `2px solid ${bookingType === 'coaching' ? selectedColor : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span>🏆</span>
              <span>Coaching</span>
            </button>
          </div>
          
          {/* Player Selection Fields */}
          <div style={{ marginBottom: '30px' }}>
            {bookingType === 'singles' && (
              <>
                {/* Player 1 */}
                <div style={{ marginBottom: '16px' }}>
                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: selectedPlayers[0] ? `2px solid ${selectedColor}` : '2px solid rgba(5, 35, 51, 0.2)'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '20px',
                    backgroundColor: selectedPlayers[0] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedPlayers[0] ? '#ffffff' : '#052333',
                    fontWeight: '600',
                    fontSize: '16px',
                    flexShrink: 0
                  }}>
                    {selectedPlayers[0] ? selectedPlayers[0].name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {selectedPlayers[0] ? (
                      <div style={{ color: '#052333', fontSize: '16px', fontWeight: '500' }}>
                        {selectedPlayers[0].name}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Type players name & select"
                        value={showPlayerDropdown === 0 ? playerSearchTerm : ''}
                        onChange={(e) => {
                          setPlayerSearchTerm(e.target.value);
                          setShowPlayerDropdown(0);
                        }}
                        onFocus={() => setShowPlayerDropdown(0)}
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          fontSize: '16px',
                          color: '#052333',
                          backgroundColor: 'transparent'
                        }}
                      />
                    )}
                    {showPlayerDropdown === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: '#ffffff',
                        borderRadius: '6px',
                        marginTop: '4px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000
                      }}>
                        {filteredPlayers.map((player) => (
                          <div
                            key={player.id}
                            onClick={() => handleSelectPlayer(0, player)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(5, 35, 51, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '16px',
                              backgroundColor: selectedColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}>
                              {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                                {player.name}
                              </div>
                              <div style={{ color: '#666', fontSize: '12px' }}>
                                {player.email}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div
                          onClick={() => handleAddGuest(0)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            borderTop: '1px solid rgba(5, 35, 51, 0.1)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '16px',
                            backgroundColor: '#052333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            G
                          </div>
                          <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                            Guest
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedPlayers[0] && (
                    <button
                      onClick={() => handleSelectPlayer(0, null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        fontSize: '20px',
                        padding: '4px'
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
                </div>
                {/* Player 2 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: selectedPlayers[1] ? `2px solid ${selectedColor}` : '2px solid rgba(5, 35, 51, 0.2)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: selectedPlayers[1] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: selectedPlayers[1] ? '#ffffff' : '#052333',
                      fontWeight: '600',
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      {selectedPlayers[1] ? (selectedPlayers[1].id === 'guest' ? 'G' : selectedPlayers[1].name.charAt(0).toUpperCase()) : '?'}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      {selectedPlayers[1] ? (
                        <div style={{ color: '#052333', fontSize: '16px', fontWeight: '500' }}>
                          {selectedPlayers[1].name}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Type players name & select"
                          value={showPlayerDropdown === 1 ? playerSearchTerm : ''}
                          onChange={(e) => {
                            setPlayerSearchTerm(e.target.value);
                            setShowPlayerDropdown(1);
                          }}
                          onFocus={() => setShowPlayerDropdown(1)}
                          style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            fontSize: '16px',
                            color: '#052333',
                            backgroundColor: 'transparent'
                          }}
                        />
                      )}
                      {showPlayerDropdown === 1 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          marginTop: '4px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 1000
                        }}>
                          {filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => handleSelectPlayer(1, player)}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(5, 35, 51, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '16px',
                                backgroundColor: selectedColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '14px'
                              }}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                                  {player.name}
                                </div>
                                <div style={{ color: '#666', fontSize: '12px' }}>
                                  {player.email}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div
                            onClick={() => handleAddGuest(1)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              borderTop: '1px solid rgba(5, 35, 51, 0.1)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '16px',
                              backgroundColor: '#052333',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: '600',
                              fontSize: '14px'
                            }}>
                              G
                            </div>
                            <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                              Guest
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedPlayers[1] && (
                      <button
                        onClick={() => handleSelectPlayer(1, null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: '4px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {bookingType === 'doubles' && (
              <>
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} style={{ marginBottom: '16px' }}>
                    <div style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      border: selectedPlayers[index] ? `2px solid ${selectedColor}` : '2px solid rgba(5, 35, 51, 0.2)'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '20px',
                        backgroundColor: selectedPlayers[index] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: selectedPlayers[index] ? '#ffffff' : '#052333',
                        fontWeight: '600',
                        fontSize: '16px',
                        flexShrink: 0
                      }}>
                        {selectedPlayers[index] ? (selectedPlayers[index].id === 'guest' ? 'G' : selectedPlayers[index].name.charAt(0).toUpperCase()) : '?'}
                      </div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        {selectedPlayers[index] ? (
                          <div style={{ color: '#052333', fontSize: '16px', fontWeight: '500' }}>
                            {selectedPlayers[index].name}
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              placeholder="Type players name & select"
                              value={showPlayerDropdown === index ? playerSearchTerm : ''}
                              onChange={(e) => {
                                setPlayerSearchTerm(e.target.value);
                                setShowPlayerDropdown(index);
                              }}
                              onFocus={() => setShowPlayerDropdown(index)}
                              style={{
                                width: '100%',
                                border: 'none',
                                outline: 'none',
                                fontSize: '16px',
                                color: '#052333',
                                backgroundColor: 'transparent'
                              }}
                            />
                            {showPlayerDropdown === index && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: '#ffffff',
                                borderRadius: '6px',
                                marginTop: '4px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000
                              }}>
                                {filteredPlayers.map((player) => (
                                  <div
                                    key={player.id}
                                    onClick={() => handleSelectPlayer(index, player)}
                                    style={{
                                      padding: '12px 16px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid rgba(5, 35, 51, 0.1)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '16px',
                                      backgroundColor: selectedColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#ffffff',
                                      fontWeight: '600',
                                      fontSize: '14px'
                                    }}>
                                      {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                                        {player.name}
                                      </div>
                                      <div style={{ color: '#666', fontSize: '12px' }}>
                                        {player.email}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <div
                                  onClick={() => handleAddGuest(index)}
                                  style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    borderTop: '1px solid rgba(5, 35, 51, 0.1)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '16px',
                                    backgroundColor: '#052333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                  }}>
                                    G
                                  </div>
                                  <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                                    Guest
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {selectedPlayers[index] && (
                        <button
                          onClick={() => handleSelectPlayer(index, null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            fontSize: '20px',
                            padding: '4px'
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {bookingType === 'coaching' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    border: selectedPlayers[0] ? `2px solid ${selectedColor}` : '2px solid rgba(5, 35, 51, 0.2)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '20px',
                      backgroundColor: selectedPlayers[0] ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: selectedPlayers[0] ? '#ffffff' : '#052333',
                      fontWeight: '600',
                      fontSize: '16px',
                      flexShrink: 0
                    }}>
                      {selectedPlayers[0] ? selectedPlayers[0].name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      {selectedPlayers[0] ? (
                        <div style={{ color: '#052333', fontSize: '16px', fontWeight: '500' }}>
                          {selectedPlayers[0].name}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Type client name & select"
                          value={showPlayerDropdown === 0 ? playerSearchTerm : ''}
                          onChange={(e) => {
                            setPlayerSearchTerm(e.target.value);
                            setShowPlayerDropdown(0);
                          }}
                          onFocus={() => setShowPlayerDropdown(0)}
                          style={{
                            width: '100%',
                            border: 'none',
                            outline: 'none',
                            fontSize: '16px',
                            color: '#052333',
                            backgroundColor: 'transparent'
                          }}
                        />
                      )}
                      {showPlayerDropdown === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: '#ffffff',
                          borderRadius: '6px',
                          marginTop: '4px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          zIndex: 1000
                        }}>
                          {filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => handleSelectPlayer(0, player)}
                              style={{
                                padding: '12px 16px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(5, 35, 51, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '16px',
                                backgroundColor: selectedColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: '600',
                                fontSize: '14px'
                              }}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ color: '#052333', fontSize: '14px', fontWeight: '500' }}>
                                  {player.name}
                                </div>
                                <div style={{ color: '#666', fontSize: '12px' }}>
                                  {player.email}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedPlayers[0] && (
                      <button
                        onClick={() => handleSelectPlayer(0, null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          fontSize: '20px',
                          padding: '4px'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {/* Coach Selection - List */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    border: selectedPlayers[1] ? `2px solid ${selectedColor}` : '2px solid rgba(5, 35, 51, 0.2)'
                  }}>
                    {selectedPlayers[1] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '20px',
                          backgroundColor: selectedColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          fontWeight: '600',
                          fontSize: '16px',
                          flexShrink: 0
                        }}>
                          {selectedPlayers[1].name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#052333', fontSize: '16px', fontWeight: '500' }}>
                            {selectedPlayers[1].name}
                          </div>
                          <div style={{ color: '#666', fontSize: '12px' }}>
                            {selectedPlayers[1].email}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectPlayer(1, null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            fontSize: '20px',
                            padding: '4px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {coaches.map((coach) => (
                          <div
                            key={coach.id}
                            onClick={() => handleSelectPlayer(1, coach)}
                            style={{
                              padding: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(5, 35, 51, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '20px',
                              backgroundColor: selectedColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: '600',
                              fontSize: '16px',
                              flexShrink: 0
                            }}>
                              {coach.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#052333', fontSize: '16px', fontWeight: '500' }}>
                                {coach.name}
                              </div>
                              <div style={{ color: '#666', fontSize: '12px' }}>
                                {coach.email}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
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
            >
              Back
            </button>
            <button
              onClick={() => {
                // Prepare players data for navigation
                const playersData = selectedPlayers
                  .filter(p => p !== null)
                  .map(p => ({
                    id: p?.id || '',
                    name: p?.name || '',
                    email: p?.email || '',
                    isGuest: p === null || !p.id
                  }));
                
                // Build URL params for confirm page
                const params = new URLSearchParams({
                  courtId: searchParams.get('courtId') || searchParams.get('court') || '',
                  court: court || '',
                  date: date || '',
                  duration: duration || '',
                  bookingType: bookingType
                });
                
                if (time) {
                  params.set('time', time);
                }
                
                // Add players as JSON in URL
                if (playersData.length > 0) {
                  params.set('players', encodeURIComponent(JSON.stringify(playersData)));
                }
                
                router.push(`/club/${slug}/confirm?${params.toString()}`);
              }}
              style={{
                flex: 1,
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: selectedColor,
                color: '#ffffff',
                border: `2px solid ${selectedColor}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Next step
            </button>
          </div>
        </div>
      </div>
      <ClubFooter fontColor={fontColor} />
    </div>
  );
}

