# Club Pages Structure Reorganization Plan

## Current Issues
- Shared components (ClubHeader, ClubFooter, ClubNotifications) are in `/app/club/[slug]/` instead of a shared location
- Duplicate layout code across pages (header, footer, background, loading states)
- Inconsistent patterns between server/client components
- No centralized types for club-related interfaces
- No reusable hooks for common club page logic

## Proposed Structure

```
apps/web/src/
├── components/
│   └── club/
│       ├── ClubHeader.tsx          # Shared header component
│       ├── ClubFooter.tsx          # Shared footer component
│       ├── ClubNotifications.tsx   # Shared notifications component
│       ├── ClubLayout.tsx          # Layout wrapper component
│       └── index.ts                # Clean exports
│
├── lib/
│   ├── club-settings.ts            # Already exists - server-side settings fetch
│   └── club-types.ts               # NEW: Shared TypeScript interfaces
│
├── hooks/
│   └── useClubSettings.ts          # NEW: Client-side hook for club settings
│
└── app/
    └── club/
        └── [slug]/
            ├── page.tsx            # Main booking page
            ├── events/
            │   ├── page.tsx        # Server component
            │   └── ClubEventsClient.tsx
            ├── matches/
            │   └── page.tsx        # Client component
            └── ... (other pages)
```

## Benefits
1. **Shared Components**: All club components in one place, easier to maintain
2. **ClubLayout Wrapper**: Reduces duplication, ensures consistency
3. **Type Safety**: Centralized types prevent inconsistencies
4. **Reusable Hooks**: Common logic extracted for reuse
5. **Clean Imports**: Index files for better developer experience

## Implementation Steps
1. Move shared components to `components/club/`
2. Create `ClubLayout` wrapper component
3. Create shared types file
4. Create custom hooks
5. Update all pages to use new structure
6. Create index files for clean imports


