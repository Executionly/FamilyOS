//
// Plain-data source for "what the app does and where to find it." Kept as data
// (not JSX) so the exact same content can later be joined into a system prompt
// for the Family AI chat function, without duplicating this list a second time.

export interface GuideSection {
  id: string;
  icon: string; // Ionicons name
  title: string;
  summary: string; // one line, shown collapsed
  description: string; // fuller explanation — plain text, safe to feed to an LLM later
  route?: string; // optional deep link for a "Go there" button
}

export const APP_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'home',
    icon: 'home-outline',
    title: 'Home Dashboard',
    summary: "Your family's daily overview",
    description:
      "The Home tab shows your family's progress at a glance — open commitments, chores due today, " +
      'upcoming events, and a 7-day meeting activity chart. The Action Hub gives quick shortcuts to add ' +
      'an event, log a chore, start a meeting, or view family members.',
    route: '/(tabs)',
  },
  {
    id: 'calendar',
    icon: 'calendar-outline',
    title: 'Family Calendar',
    summary: 'Track events, birthdays, and appointments',
    description:
      'Add one-off or recurring events — school schedules, medical appointments, travel plans, ' +
      'birthdays, and anniversaries. Birthdays and anniversaries automatically repeat every year. Free ' +
      'plan events can repeat up to every two weeks; monthly and longer recurrence needs Premium.',
    route: '/(stack)/calendar',
  },
  {
    id: 'chores',
    icon: 'construct-outline',
    title: 'Chores & Commitments',
    summary: 'Assign tasks and track follow-through',
    description:
      "Create chores and assign them to family members. Chores due today show up on your Home " +
      "dashboard, and marking one complete updates your family's chore completion rate.",
    route: '/(stack)/chores',
  },
  {
    id: 'meal-planner',
    icon: 'restaurant-outline',
    title: 'Meal Planner',
    summary: "Plan your family's weekly menu",
    description:
      "Build out your family's weekly meal plan in one place. This is a Premium feature.",
    route: '/(stack)/meal',
  },
  {
    id: 'meetings',
    icon: 'people-outline',
    title: 'Family Meetings',
    summary: 'AI-generated agendas and summaries',
    description:
      "Schedule a family meeting and let AI build a structured agenda based on your family's values and " +
      'open commitments. After the meeting, AI can also generate a summary with key decisions and action ' +
      'items. Free plan includes one free agenda and one free summary; Premium unlocks unlimited use.',
    route: '/meetings/setup',
  },
  {
    id: 'foundation',
    icon: 'flag-outline',
    title: 'Family Foundation',
    summary: "Your family's mission and values",
    description:
      "Define your family's mission statement and core values. These feed directly into AI-generated " +
      "meeting agendas, so the more complete your Foundation is, the more personalized your family's " +
      'agendas will be.',
    route: '/(tabs)/foundation',
  },
  {
    id: 'family-ai',
    icon: 'sparkles-outline',
    title: 'Family AI',
    summary: "Your family's AI companion",
    description:
      "Ask the Family AI questions about your schedule, get a daily briefing when you open the app, and " +
      "let it help manage your family's day-to-day. Free plan includes a one-time trial; Premium unlocks " +
      'full AI access.',
  },
  {
    id: 'legacy',
    icon: 'images-outline',
    title: 'Family Media',
    summary: 'Preserve family photos and videos',
    description:
      'Store family photos and videos as lasting memories. Free plan includes limited storage and up to ' +
      '3 videos; Premium unlocks unlimited storage, subject to reasonable-use protections.',
    route: '/(stack)/media-library',
  },
  {
    id: 'members',
    icon: 'people-circle-outline',
    title: 'Family Members',
    summary: "Manage who's in your family",
    description:
      'Add adults, teens, and managed child profiles to your family. Free plan supports up to 4 members ' +
      'total; Premium unlocks unlimited members.',
    route: '/(stack)/member-list',
  },
  {
    id: 'premium',
    icon: 'star-outline',
    title: 'Premium',
    summary: 'See what upgrading unlocks',
    description:
      'Premium unlocks unlimited family members, unlimited storage, expanded AI access, unlimited ' +
      'meeting agendas and summaries, and advanced planning and legacy features.',
    route: '/(stack)/paywall',
  },
  {
    id: 'account',
    icon: 'settings-outline',
    title: 'Account & Settings',
    summary: 'Manage your profile and account',
    description:
      'Edit your family name and photo, manage your subscription, review legal documents, sign out, or ' +
      'delete your account entirely from the Profile tab.',
    route: '/(stack)/account-settings',
  },
];