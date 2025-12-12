/**
 * Timezone Utilities
 * 
 * Functions to handle timezone conversions based on club location
 */

// Map of countries to IANA timezone identifiers
// This is a simplified mapping - you may want to expand this or allow manual timezone selection
const COUNTRY_TO_TIMEZONE: Record<string, string> = {
  'South Africa': 'Africa/Johannesburg',
  'United States': 'America/New_York', // Default to Eastern, but should be more specific
  'United Kingdom': 'Europe/London',
  'Australia': 'Australia/Sydney', // Default to Sydney, but should be more specific
  'New Zealand': 'Pacific/Auckland',
  'Canada': 'America/Toronto', // Default to Eastern, but should be more specific
  'France': 'Europe/Paris',
  'Germany': 'Europe/Berlin',
  'Spain': 'Europe/Madrid',
  'Italy': 'Europe/Rome',
  'Netherlands': 'Europe/Amsterdam',
  'Belgium': 'Europe/Brussels',
  'Switzerland': 'Europe/Zurich',
  'Portugal': 'Europe/Lisbon',
  'Greece': 'Europe/Athens',
  'Poland': 'Europe/Warsaw',
  'Czech Republic': 'Europe/Prague',
  'Austria': 'Europe/Vienna',
  'Sweden': 'Europe/Stockholm',
  'Norway': 'Europe/Oslo',
  'Denmark': 'Europe/Copenhagen',
  'Finland': 'Europe/Helsinki',
  'Ireland': 'Europe/Dublin',
  'Brazil': 'America/Sao_Paulo',
  'Argentina': 'America/Argentina/Buenos_Aires',
  'Chile': 'America/Santiago',
  'Mexico': 'America/Mexico_City',
  'Japan': 'Asia/Tokyo',
  'China': 'Asia/Shanghai',
  'India': 'Asia/Kolkata',
  'Singapore': 'Asia/Singapore',
  'Hong Kong': 'Asia/Hong_Kong',
  'Thailand': 'Asia/Bangkok',
  'Malaysia': 'Asia/Kuala_Lumpur',
  'Indonesia': 'Asia/Jakarta',
  'Philippines': 'Asia/Manila',
  'South Korea': 'Asia/Seoul',
  'Taiwan': 'Asia/Taipei',
  'United Arab Emirates': 'Asia/Dubai',
  'Saudi Arabia': 'Asia/Riyadh',
  'Israel': 'Asia/Jerusalem',
  'Turkey': 'Europe/Istanbul',
  'Russia': 'Europe/Moscow', // Very large country, should be more specific
  'Egypt': 'Africa/Cairo',
  'Kenya': 'Africa/Nairobi',
  'Nigeria': 'Africa/Lagos',
  'Morocco': 'Africa/Casablanca',
};

/**
 * Get timezone for a club based on country
 * Falls back to UTC if country is not found or not set
 */
export function getClubTimezone(country?: string | null, timezone?: string | null): string {
  // If timezone is explicitly set, use it
  if (timezone && timezone.trim()) {
    return timezone.trim();
  }
  
  // Otherwise, try to get timezone from country
  if (country && country.trim()) {
    const tz = COUNTRY_TO_TIMEZONE[country.trim()];
    if (tz) {
      return tz;
    }
  }
  
  // Default to UTC
  return 'UTC';
}

/**
 * Format a time string (HH:MM) in the club's timezone
 * Returns the time as it would appear in the club's local timezone
 */
export function formatTimeInTimezone(
  timeString: string, 
  timezone: string, 
  date: Date = new Date()
): string {
  try {
    // Parse the time string (HH:MM format)
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Create a date object for today in the club's timezone
    const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Set the time components
    dateInTimezone.setHours(hours, minutes, 0, 0);
    
    // Format back to HH:MM in the club's timezone
    return dateInTimezone.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting time in timezone:', error);
    return timeString; // Return original if error
  }
}

/**
 * Get current time in club's timezone as HH:MM string
 */
export function getCurrentTimeInTimezone(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error getting current time in timezone:', error);
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }
}

/**
 * Convert a date/time to the club's timezone
 */
export function convertToClubTimezone(date: Date, timezone: string): Date {
  try {
    // Get the date string in the club's timezone
    const dateString = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(dateString);
  } catch (error) {
    console.error('Error converting to club timezone:', error);
    return date; // Return original if error
  }
}

/**
 * Check if a time (HH:MM) in club's timezone is in the past
 */
export function isTimeInPast(timeString: string, date: Date, timezone: string): boolean {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    
    // Get current time in club's timezone
    const nowInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Create date object for the specified date and time in club's timezone
    const targetDate = new Date(date);
    targetDate.setHours(hours, minutes, 0, 0);
    const targetInTimezone = new Date(targetDate.toLocaleString('en-US', { timeZone: timezone }));
    
    return targetInTimezone < nowInTimezone;
  } catch (error) {
    console.error('Error checking if time is in past:', error);
    return false;
  }
}

