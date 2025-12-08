'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ClubHeader from './ClubHeader';
import ClubFooter from './ClubFooter';
import styles from '@/styles/frontend.module.css';

interface Club {
  id: string;
  name: string;
  backgroundColor?: string;
  fontColor?: string;
  numberOfCourts?: number;
}

interface ClubPageClientProps {
  club: Club | null;
  slug: string;
  logo?: string;
  backgroundColor: string;
  fontColor: string;
  selectedColor: string;
  hoverColor: string;
  openingTime: string;
  closingTime: string;
  bookingSlotInterval: number;
  sessionDuration: number[];
}

export default function ClubPageClient({ club, slug, logo, backgroundColor, fontColor, selectedColor, hoverColor, openingTime, closingTime, bookingSlotInterval, sessionDuration }: ClubPageClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const displayName = club?.name || slug.replace(/([A-Z])/g, ' $1').trim();
  const numberOfCourts = club?.numberOfCourts || 1;
  
  // Ensure sessionDuration always has a default value
  const validSessionDuration = (sessionDuration && Array.isArray(sessionDuration) && sessionDuration.length > 0) ? sessionDuration : [60];
  
  console.log('ClubPageClient received props:', { 
    hoverColor, 
    bookingSlotInterval, 
    openingTime, 
    closingTime,
    selectedColor,
    sessionDuration,
    validSessionDuration
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [dateScrollIndex, setDateScrollIndex] = useState<number>(0);

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

  // Generate court numbers
  const courts = Array.from({ length: numberOfCourts }, (_, i) => i + 1);

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
      <div className={styles.container} style={{ flex: 1 }}>

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
                  color: selectedDate === date.dateString ? '#ffffff' : undefined
                }}
                onMouseEnter={(e) => {
                  if (selectedDate !== date.dateString) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
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
                    color: selectedTime === time ? '#ffffff' : undefined
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTime !== time) {
                      e.currentTarget.style.backgroundColor = hoverColor;
                      e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
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
          <div className={styles.courtButtonsGrid}>
            {courts.map((courtNum) => (
              <div 
                key={courtNum} 
                className={styles.courtCard}
                style={{
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  padding: '16px'
                }}
              >
                <div
                  className={styles.courtButton}
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#052333',
                    width: '100%',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: '500' }}>Court {courtNum}</span>
                  </div>
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
                                court: courtNum.toString(),
                                date: selectedDate,
                                duration: duration.toString()
                              });
                              // Add time if selected
                              if (selectedTime) {
                                params.set('time', selectedTime);
                              }
                              router.push(`/club/${slug}/players?${params.toString()}`);
                            }}
                            className={`${styles.durationButton} ${selectedCourt === courtNum && selectedDuration === duration ? styles.durationButtonSelected : ''}`}
                            style={{
                              backgroundColor: selectedCourt === courtNum && selectedDuration === duration ? selectedColor : 'rgba(5, 35, 51, 0.1)',
                              borderColor: selectedCourt === courtNum && selectedDuration === duration ? selectedColor : 'rgba(5, 35, 51, 0.2)',
                              color: selectedCourt === courtNum && selectedDuration === duration ? '#ffffff' : '#052333'
                            }}
                            onMouseEnter={(e) => {
                              if (!(selectedCourt === courtNum && selectedDuration === duration)) {
                                e.currentTarget.style.backgroundColor = hoverColor;
                                e.currentTarget.style.borderColor = 'rgba(5, 35, 51, 0.3)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(selectedCourt === courtNum && selectedDuration === duration)) {
                                e.currentTarget.style.backgroundColor = 'rgba(5, 35, 51, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(5, 35, 51, 0.2)';
                              }
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
            ))}
          </div>
        </div>
      </div>
      <ClubFooter fontColor={fontColor} />
    </div>
  );
}
