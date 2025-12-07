'use client';

import { useState, useCallback } from 'react';
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
}

export default function ClubPageClient({ club, slug, logo, backgroundColor, fontColor, selectedColor, hoverColor, openingTime, closingTime, bookingSlotInterval }: ClubPageClientProps) {
  const displayName = club?.name || slug.replace(/([A-Z])/g, ' $1').trim();
  const numberOfCourts = club?.numberOfCourts || 1;
  
  console.log('ClubPageClient received props:', { 
    hoverColor, 
    bookingSlotInterval, 
    openingTime, 
    closingTime,
    selectedColor 
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
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

  const handleDateChange = (dateString: string) => {
    setSelectedDate(dateString);
    setSelectedCourt(null);
    setSelectedTime(null);
  };

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
              <button
                key={courtNum}
                onClick={() => {
                  setSelectedCourt(courtNum);
                }}
                className={`${styles.courtButton} ${selectedCourt === courtNum ? styles.courtButtonSelected : ''}`}
                style={{
                  backgroundColor: selectedCourt === courtNum ? selectedColor : '#ffffff',
                  borderColor: selectedCourt === courtNum ? selectedColor : undefined,
                  color: selectedCourt === courtNum ? '#ffffff' : undefined
                }}
                onMouseEnter={(e) => {
                  if (selectedCourt !== courtNum) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                    e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCourt !== courtNum) {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#052333';
                  }
                }}
              >
                Court {courtNum}
              </button>
            ))}
          </div>
        </div>

        {/* Book Button */}
        {selectedCourt && selectedTime && (
          <div className={styles.bookButtonContainer}>
            <button
              onClick={handleBooking}
              className={styles.bookButton}
              style={{
                backgroundColor: fontColor,
                color: backgroundColor
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Book Court {selectedCourt} at {selectedTime}
            </button>
          </div>
        )}
      </div>
      <ClubFooter fontColor={fontColor} />
    </div>
  );
}
