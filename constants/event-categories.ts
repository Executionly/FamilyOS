import { Ionicons } from '@expo/vector-icons';

export type EventCategory =
  | 'school' | 'medical' | 'travel' | 'financial' | 'activity' | 'household' | 'routine' | 'general'
  | 'birthday' | 'anniversary' | 'celebration';

export const CATEGORIES: { key: EventCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'general', label: 'General', icon: 'calendar-outline' },
  { key: 'school', label: 'School', icon: 'school-outline' },
  { key: 'medical', label: 'Medical', icon: 'medkit-outline' },
  { key: 'travel', label: 'Travel', icon: 'airplane-outline' },
  { key: 'financial', label: 'Bills & Finance', icon: 'cash-outline' },
  { key: 'activity', label: "Kids' Activities", icon: 'football-outline' },
  { key: 'household', label: 'Household', icon: 'home-outline' },
  { key: 'routine', label: 'Family Routine', icon: 'repeat-outline' },
  { key: 'birthday', label: 'Birthday', icon: 'gift-outline' },
  { key: 'anniversary', label: 'Anniversary', icon: 'heart-outline' },
  { key: 'celebration', label: 'Celebration', icon: 'star-outline' },
];

// Categories that are date-only (no meaningful time-of-day) and recur every year by nature
export const RECURRING_PERSON_CATEGORIES: EventCategory[] = ['birthday', 'anniversary'];