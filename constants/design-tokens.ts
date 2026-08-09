// constants/design-tokens.ts
export const colors = {
  harbor: '#0a7ea4',       // primary — kept as-is
  harborDeep: '#063842',   // ink — near-black derived from primary hue, not generic gray-900
  harborSoft: '#E4F1F5',   // tinted backdrop for rings/badges, replaces flat #E0F2FE
  backdrop: '#F3F7F8',     // page background — teal-tinted, not pure gray
  surface: '#FFFFFF',
  border: '#DCE8EB',       // teal-tinted border, not generic #E5E7EB
  sunrise: '#E8983D',      // warm complementary accent — the one deliberate contrast color
  sprout: '#3FA36B',       // success/completion
  ember: '#D6503A',        // overdue/alert
  muted: '#6B8891',        // teal-tinted muted text, not generic #9CA3AF
} as const;

export const type = {
  display: 'SpaceGrotesk_700Bold',   // headings, greeting — geometric, distinctive
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemibold: 'Inter_600SemiBold',
} as const;