/**
 * Convert a club name to a URL-friendly slug
 * Example: "Constantia Tennis Club" -> "constantiatennisclub"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '') // Remove all non-alphanumeric characters
    .replace(/^\s+|\s+$/g, ''); // Remove leading/trailing spaces
}

/**
 * Check if a slug matches a club name (case-insensitive, ignores spaces and special chars)
 */
export function slugMatchesClub(slug: string, clubName: string): boolean {
  return generateSlug(clubName) === slug;
}

