import type { ProductivityEnergy, TemperamentType } from '@/types';

export interface ResultContent {
  label: string;
  summary: string;
  strengths: string[];
  howIMayContribute: string;
  howIMayPreferToWork: string;
  whatIMayNeedFromOthers: string;
  growthOpportunity: string;
}

export const TEMPERAMENT_CONTENT: Record<TemperamentType, ResultContent> = {
  sanguine: {
    label: 'Sanguine',
    summary:
      'Your answers suggest you are energized by people and possibility. You may naturally bring warmth, spontaneity, and enthusiasm to your family.',
    strengths: [
      'Bringing energy and fun to the family',
      'Making others feel welcome',
      'Adapting quickly to new situations',
      'Encouraging optimism when things get hard',
    ],
    howIMayContribute:
      'You may naturally lift the family mood and spark spontaneous, joyful moments together.',
    howIMayPreferToWork:
      'You may prefer flexible, social activities over rigid plans and schedules.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you follow through once the excitement fades.',
    growthOpportunity:
      'Explore whether following through on commitments, even the less exciting ones, feels like an area to grow in.',
  },
  choleric: {
    label: 'Choleric',
    summary:
      'Your answers suggest you are driven and decisive. You may naturally bring focus, leadership, and momentum to your family.',
    strengths: [
      'Taking initiative and getting things done',
      'Making quick, confident decisions',
      'Staying focused on goals',
      'Motivating others to act',
    ],
    howIMayContribute:
      'You may naturally step up to lead family projects and push things toward completion.',
    howIMayPreferToWork:
      'You may prefer clear goals and the freedom to make decisions quickly.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you slow down and consider others feelings.',
    growthOpportunity:
      'Explore whether patience, giving others time to process or disagree, feels like an area to grow in.',
  },
  melancholic: {
    label: 'Melancholic',
    summary:
      'Your answers suggest you are thoughtful and detail-oriented. You may naturally bring depth, care, and precision to your family.',
    strengths: [
      'Noticing details others miss',
      'Thinking things through carefully',
      'Holding high standards',
      'Being loyal and dependable',
    ],
    howIMayContribute:
      'You may naturally bring thoughtfulness and quality to whatever the family takes on together.',
    howIMayPreferToWork:
      'You may prefer quiet, unhurried time to think things through before deciding.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you move forward even when things are not perfect.',
    growthOpportunity:
      'Explore whether letting go of small imperfections feels like an area to grow in.',
  },
  phlegmatic: {
    label: 'Phlegmatic',
    summary:
      'Your answers suggest you are calm and steady. You may naturally bring peace, patience, and stability to your family.',
    strengths: [
      'Staying calm under pressure',
      'Helping others feel at ease',
      'Being a steady, reliable presence',
      'Avoiding unnecessary conflict',
    ],
    howIMayContribute:
      'You may naturally help the family feel calm and grounded, especially during stressful moments.',
    howIMayPreferToWork:
      'You may prefer a relaxed pace without pressure to rush or decide quickly.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you speak up and share your preferences.',
    growthOpportunity:
      'Explore whether sharing your opinion more often, even when it might cause friction, feels like an area to grow in.',
  },
};

export const PRODUCTIVITY_ENERGY_CONTENT: Record<ProductivityEnergy, ResultContent> = {
  achiever: {
    label: 'Achiever',
    summary:
      'Your answers suggest you are energized by progress. You may naturally bring focus, drive, and momentum to your family.',
    strengths: [
      'Turning plans into action',
      'Staying focused on goals',
      'Creating momentum when things stall',
      'Following through to the finish',
    ],
    howIMayContribute: 'You may naturally help the family actually finish what it starts.',
    howIMayPreferToWork: 'You may prefer clear goals with visible progress along the way.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you slow down and enjoy the moment, not just the outcome.',
    growthOpportunity: 'Explore whether patience with a slower pace feels like an area to grow in.',
  },
  innovator: {
    label: 'Innovator',
    summary:
      'Your answers suggest you are energized by ideas. You may naturally bring creativity, curiosity, and fresh thinking to your family.',
    strengths: [
      'Coming up with new ideas',
      'Seeing possibilities others miss',
      'Making things feel fresh and interesting',
      'Being open to change',
    ],
    howIMayContribute: 'You may naturally bring new ideas and creative energy to family life.',
    howIMayPreferToWork: 'You may prefer variety and the freedom to try new approaches.',
    whatIMayNeedFromOthers: 'You may benefit from family members who help turn your ideas into a plan.',
    growthOpportunity:
      'Explore whether following through on one idea at a time feels like an area to grow in.',
  },
  organizer: {
    label: 'Organizer',
    summary:
      'Your answers suggest you are energized by structure. You may naturally bring order, planning, and reliability to your family.',
    strengths: [
      'Creating order out of chaos',
      'Planning ahead',
      'Keeping track of details',
      'Making sure things run smoothly',
    ],
    howIMayContribute: 'You may naturally help the family stay organized and on track.',
    howIMayPreferToWork: 'You may prefer having a clear plan before diving in.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you stay flexible when plans change.',
    growthOpportunity: 'Explore whether going with the flow, even without a plan, feels like an area to grow in.',
  },
  unifier: {
    label: 'Unifier',
    summary:
      'Your answers suggest you are energized by connection. You may naturally bring warmth, empathy, and togetherness to your family.',
    strengths: [
      'Making sure everyone feels included',
      'Listening well',
      'Noticing how others are feeling',
      'Bringing people together',
    ],
    howIMayContribute: 'You may naturally help the family feel close and connected.',
    howIMayPreferToWork: 'You may prefer working alongside others rather than alone.',
    whatIMayNeedFromOthers:
      'You may benefit from family members who help you speak up about your own needs, not just others.',
    growthOpportunity:
      'Explore whether prioritizing your own needs alongside everyone else needs feels like an area to grow in.',
  },
};