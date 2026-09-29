export const GAME_META = {
  bible_trivia: {
    label: 'Bible Trivia',
    description: 'Test your knowledge of scripture',
    icon: 'book-outline' as const,
    color: '#8B5CF6',
  },
  quiz: {
    label: 'Family Quiz',
    description: 'General knowledge, fun for everyone',
    icon: 'help-circle-outline' as const,
    color: '#F59E0B',
  },
  family_feud: {
    label: 'Family Feud',
    description: 'Two teams, one board — guess the top answers before the strikes pile up.',
    icon: 'people-circle' as const,
    color: '#EF4444',
  }
};

export const QUESTION_TIME_LIMIT_MS = 15000; // 15 seconds per question
export const SOLO_QUESTION_TIME_LIMIT_MS = 20000; // 15 seconds per question