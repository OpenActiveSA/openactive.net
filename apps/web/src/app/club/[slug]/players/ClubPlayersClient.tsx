'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClientClient } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { ClubAnimationProvider, useClubAnimation } from '@/components/club/ClubAnimationContext';
import ClubHeader from '@/components/club/ClubHeader';
import ClubFooter from '@/components/club/ClubFooter';
import OpenActiveLoader from '@/components/OpenActiveLoader';
import styles from '@/styles/frontend.module.css';
import type { ClubSettings } from '@/lib/club-settings';

interface ClubPlayersClientProps {
  slug: string;
  clubSettings: ClubSettings;
}

function ClubPlayersContent({ slug, clubSettings }: ClubPlayersClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { contentVisible, setContentVisible } = useClubAnimation();
  
  // Player selection state
  const [bookingType, setBookingType] = useState<'singles' | 'doubles' | 'coaching'>('singles');
  const [selectedPlayers, setSelectedPlayers] = useState<Array<{ id: string; name: string; email: string } | null>>([null, null, null, null]);
  const [playerSearchTerm, setPlayerSearchTerm] = useState<string>('');
  const [showPlayerDropdown, setShowPlayerDropdown] = useState<number | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [coaches, setCoaches] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  
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

  // Trigger content visibility immediately since we have club settings
  useEffect(() => {
    setContentVisible(true);
  }, [setContentVisible]);

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
      if (!clubSettings.id) return;
      try {
        setIsLoadingPlayers(true);
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
      } finally {
        setIsLoadingPlayers(false);
      }
    };
    
    loadPlayers();
  }, [clubSettings.id]);
  
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

  return (
    <div 
      style={{
        minHeight: '100vh',
        backgroundColor: clubSettings.backgroundColor,
        color: clubSettings.fontColor,
        display: 'flex',
        flexDirection: 'column',
      } as React.CSSProperties}
    >
      <ClubHeader 
        logo={clubSettings.logo} 
        fontColor={clubSettings.fontColor} 
        backgroundColor={clubSettings.backgroundColor} 
        selectedColor={clubSettings.selectedColor} 
        currentPath={`/club/${slug}/players`} 
      />
      <div className={styles.container} style={{ flex: 1 }}>
        {isLoadingPlayers ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: '16px'
          }}>
            <OpenActiveLoader fontColor="#ffffff" size={48} />
          </div>
        ) : (
        <div 
          className={styles.playersPageContainer}
          style={{ 
            opacity: contentVisible ? 1 : 0,
            transform: contentVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            '--selected-color': clubSettings.selectedColor
          } as React.CSSProperties & { '--selected-color': string }}
        >
          <h1 className={styles.playersPageTitle} style={{ color: clubSettings.fontColor }}>
            Select players
          </h1>
          
          {/* Booking Summary Card */}
          {court && date && duration && (
            <div className={styles.bookingSummaryCard}>
              <div className={styles.bookingSummaryItem}>
                {typeof formattedDate === 'object' && formattedDate !== null && (
                  <>
                    <div className={styles.bookingSummaryLabel} style={{ color: clubSettings.fontColor }}>
                      {formattedDate.weekday}
                    </div>
                    <div className={styles.bookingSummaryValue} style={{ color: clubSettings.fontColor }}>
                      {formattedDate.day} {formattedDate.month}
                    </div>
                  </>
                )}
              </div>
              {time && (
                <div className={styles.bookingSummaryItem}>
                  <div className={styles.bookingSummaryLabel} style={{ color: clubSettings.fontColor }}>
                    Start
                  </div>
                  <div className={styles.bookingSummaryValue} style={{ color: clubSettings.fontColor }}>
                    {time}
                  </div>
                </div>
              )}
              <div className={styles.bookingSummaryItem} style={{ borderRight: 'none' }}>
                <div className={styles.bookingSummaryLabel} style={{ color: clubSettings.fontColor }}>
                  Court {court}
                </div>
                <div className={styles.bookingSummaryValue} style={{ color: clubSettings.fontColor }}>
                  {duration} min
                </div>
              </div>
            </div>
          )}
          
          {/* Game Type Selection */}
          <div className={styles.gameTypeContainer}>
            <button
              onClick={() => setBookingType('singles')}
              className={styles.gameTypeButton}
              style={{
                backgroundColor: bookingType === 'singles' ? clubSettings.selectedColor : '#ffffff',
                color: bookingType === 'singles' ? '#ffffff' : '#052333',
                borderColor: bookingType === 'singles' ? 'transparent' : 'rgba(255, 255, 255, 0.3)'
              }}
            >
              <span>👤</span>
              <span>Singles</span>
            </button>
            <button
              onClick={() => setBookingType('doubles')}
              className={styles.gameTypeButton}
              style={{
                backgroundColor: bookingType === 'doubles' ? clubSettings.selectedColor : '#ffffff',
                color: bookingType === 'doubles' ? '#ffffff' : '#052333',
                borderColor: bookingType === 'doubles' ? 'transparent' : 'rgba(255, 255, 255, 0.3)'
              }}
            >
              <span>👥</span>
              <span>Doubles</span>
            </button>
            <button
              onClick={() => setBookingType('coaching')}
              className={styles.gameTypeButton}
              style={{
                backgroundColor: bookingType === 'coaching' ? clubSettings.selectedColor : '#ffffff',
                color: bookingType === 'coaching' ? '#ffffff' : '#052333',
                borderColor: bookingType === 'coaching' ? 'transparent' : 'rgba(255, 255, 255, 0.3)'
              }}
            >
              <span>🏆</span>
              <span>Coaching</span>
            </button>
          </div>
          
          {/* Player Selection Fields */}
          <div className={styles.playerSelectionContainer}>
            {bookingType === 'singles' && (
              <>
                {/* Player 1 */}
                <div className={styles.playerFieldWrapper}>
                  <div 
                    className={`${styles.playerField} ${selectedPlayers[0] ? styles.playerFieldSelected : ''}`}
                  >
                    <div 
                      className={`${styles.playerAvatar} ${selectedPlayers[0] ? styles.playerAvatarSelected : ''}`}
                      style={selectedPlayers[0] ? { backgroundColor: clubSettings.selectedColor } : {}}
                    >
                      {selectedPlayers[0] ? selectedPlayers[0].name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className={styles.playerFieldContent}>
                      {selectedPlayers[0] ? (
                        <div className={styles.playerName}>
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
                          className={styles.playerInput}
                        />
                      )}
                      {showPlayerDropdown === 0 && (
                        <div className={styles.playerDropdown}>
                          {filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => handleSelectPlayer(0, player)}
                              className={styles.playerDropdownItem}
                            >
                              <div className={styles.playerDropdownAvatar}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.playerDropdownInfo}>
                                <div className={styles.playerDropdownName}>
                                  {player.name}
                                </div>
                                <div className={styles.playerDropdownEmail}>
                                  {player.email}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div
                            onClick={() => handleAddGuest(0)}
                            className={styles.guestOption}
                          >
                            <div className={styles.guestAvatar}>
                              G
                            </div>
                            <div className={styles.guestLabel}>
                              Guest
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedPlayers[0] && (
                      <button
                        onClick={() => handleSelectPlayer(0, null)}
                        className={styles.removePlayerButton}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {/* Dividing line between player 1 and 2 */}
                <div className={styles.playerFieldDivider}></div>
                {/* Player 2 */}
                <div className={styles.playerFieldWrapper}>
                  <div 
                    className={`${styles.playerField} ${selectedPlayers[1] ? styles.playerFieldSelected : ''}`}
                  >
                    <div 
                      className={`${styles.playerAvatar} ${selectedPlayers[1] ? styles.playerAvatarSelected : ''}`}
                      style={selectedPlayers[1] ? { backgroundColor: clubSettings.selectedColor } : {}}
                    >
                      {selectedPlayers[1] ? (selectedPlayers[1].id === 'guest' ? 'G' : selectedPlayers[1].name.charAt(0).toUpperCase()) : '?'}
                    </div>
                    <div className={styles.playerFieldContent}>
                      {selectedPlayers[1] ? (
                        <div className={styles.playerName}>
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
                          className={styles.playerInput}
                        />
                      )}
                      {showPlayerDropdown === 1 && (
                        <div className={styles.playerDropdown}>
                          {filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => handleSelectPlayer(1, player)}
                              className={styles.playerDropdownItem}
                            >
                              <div className={styles.playerDropdownAvatar}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.playerDropdownInfo}>
                                <div className={styles.playerDropdownName}>
                                  {player.name}
                                </div>
                                <div className={styles.playerDropdownEmail}>
                                  {player.email}
                                </div>
                              </div>
                            </div>
                          ))}
                          <div
                            onClick={() => handleAddGuest(1)}
                            className={styles.guestOption}
                          >
                            <div className={styles.guestAvatar}>
                              G
                            </div>
                            <div className={styles.guestLabel}>
                              Guest
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedPlayers[1] && (
                      <button
                        onClick={() => handleSelectPlayer(1, null)}
                        className={styles.removePlayerButton}
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
                  <div key={index}>
                    {index === 2 && <div className={styles.playerFieldDivider}></div>}
                    <div className={styles.playerFieldWrapper}>
                      <div 
                        className={`${styles.playerField} ${selectedPlayers[index] ? styles.playerFieldSelected : ''}`}
                      >
                        <div 
                          className={`${styles.playerAvatar} ${selectedPlayers[index] ? styles.playerAvatarSelected : ''}`}
                          style={selectedPlayers[index] ? { backgroundColor: clubSettings.selectedColor } : {}}
                        >
                          {selectedPlayers[index] ? (selectedPlayers[index].id === 'guest' ? 'G' : selectedPlayers[index].name.charAt(0).toUpperCase()) : '?'}
                        </div>
                        <div className={styles.playerFieldContent}>
                          {selectedPlayers[index] ? (
                            <div className={styles.playerName}>
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
                                className={styles.playerInput}
                              />
                              {showPlayerDropdown === index && (
                                <div className={styles.playerDropdown}>
                                  {filteredPlayers.map((player) => (
                                    <div
                                      key={player.id}
                                      onClick={() => handleSelectPlayer(index, player)}
                                      className={styles.playerDropdownItem}
                                    >
                                      <div className={styles.playerDropdownAvatar}>
                                        {player.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className={styles.playerDropdownInfo}>
                                        <div className={styles.playerDropdownName}>
                                          {player.name}
                                        </div>
                                        <div className={styles.playerDropdownEmail}>
                                          {player.email}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <div
                                    onClick={() => handleAddGuest(index)}
                                    className={styles.guestOption}
                                  >
                                    <div className={styles.guestAvatar}>
                                      G
                                    </div>
                                    <div className={styles.guestLabel}>
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
                            className={styles.removePlayerButton}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
            
            {bookingType === 'coaching' && (
              <>
                <div className={styles.playerFieldWrapper}>
                  <div 
                    className={`${styles.playerField} ${selectedPlayers[0] ? styles.playerFieldSelected : ''}`}
                  >
                    <div 
                      className={`${styles.playerAvatar} ${selectedPlayers[0] ? styles.playerAvatarSelected : ''}`}
                      style={selectedPlayers[0] ? { backgroundColor: clubSettings.selectedColor } : {}}
                    >
                      {selectedPlayers[0] ? selectedPlayers[0].name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className={styles.playerFieldContent}>
                      {selectedPlayers[0] ? (
                        <div className={styles.playerName}>
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
                          className={styles.playerInput}
                        />
                      )}
                      {showPlayerDropdown === 0 && (
                        <div className={styles.playerDropdown}>
                          {filteredPlayers.map((player) => (
                            <div
                              key={player.id}
                              onClick={() => handleSelectPlayer(0, player)}
                              className={styles.playerDropdownItem}
                            >
                              <div className={styles.playerDropdownAvatar}>
                                {player.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.playerDropdownInfo}>
                                <div className={styles.playerDropdownName}>
                                  {player.name}
                                </div>
                                <div className={styles.playerDropdownEmail}>
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
                        className={styles.removePlayerButton}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {/* Coach Selection - List */}
                <div className={styles.playerFieldWrapper}>
                  <div 
                    className={`${styles.playerField} ${selectedPlayers[1] ? styles.playerFieldSelected : ''}`}
                  >
                    {selectedPlayers[1] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.coachListAvatar}>
                          {selectedPlayers[1].name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.coachListInfo}>
                          <div className={styles.coachListName}>
                            {selectedPlayers[1].name}
                          </div>
                          <div className={styles.coachListEmail}>
                            {selectedPlayers[1].email}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectPlayer(1, null)}
                          className={styles.removePlayerButton}
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className={styles.coachListContainer}>
                        {coaches.map((coach) => (
                          <div
                            key={coach.id}
                            onClick={() => handleSelectPlayer(1, coach)}
                            className={styles.coachListItem}
                          >
                            <div className={styles.coachListAvatar}>
                              {coach.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={styles.coachListInfo}>
                              <div className={styles.coachListName}>
                                {coach.name}
                              </div>
                              <div className={styles.coachListEmail}>
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
          <div className={styles.navigationButtons}>
            <button
              onClick={() => router.back()}
              className={`${styles.navButton} ${styles.navButtonBack}`}
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
              className={`${styles.navButton} ${styles.navButtonNext}`}
              style={{
                backgroundColor: clubSettings.selectedColor
              }}
            >
              Next step
            </button>
          </div>
        </div>
        )}
      </div>
      <ClubFooter fontColor={clubSettings.fontColor} />
    </div>
  );
}

export default function ClubPlayersClient(props: ClubPlayersClientProps) {
  return (
    <ClubAnimationProvider>
      <ClubPlayersContent {...props} />
    </ClubAnimationProvider>
  );
}

