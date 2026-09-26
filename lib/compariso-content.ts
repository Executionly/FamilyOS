
// Layer 1 content: no AI, works for any pair of members. Rather than
// writing a full 4x4 matrix combining both dimensions (36+ combos),
// each axis is compared independently and the two sentences are shown
// together — smaller content set, same "different is not difficult"
// framing as the rest of the free tier.

import { ProductivityEnergy, TemperamentType } from "@/types";

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('+');
}

const TEMPERAMENT_PAIRS: Record<string, string> = {
  'choleric+choleric':
    'You may both move quickly and want to take charge. That can be a strong combination for getting things done, though you may need to actively make room for each other\u2019s ideas.',
  'choleric+melancholic':
    'One of you may push for speed while the other wants to think things through first. Together you may balance quick action with careful attention to detail.',
  'choleric+phlegmatic':
    'One of you may want to decide fast while the other prefers an easy pace. You may need a bit of patience with each other\u2019s different speeds.',
  'choleric+sanguine':
    'One of you may drive toward results while the other brings energy and fun. Together you may keep things both productive and enjoyable.',
  'melancholic+melancholic':
    'You may both prefer to think things through carefully. That is a natural fit for detailed work, though you may want to watch for getting stuck in analysis together.',
  'melancholic+phlegmatic':
    'One of you may notice details closely while the other stays easygoing. Together you may bring both care and calm to the family.',
  'melancholic+sanguine':
    'One of you may prefer quiet reflection while the other is drawn to people and spontaneity. You may balance depth with lightness.',
  'phlegmatic+phlegmatic':
    'You may both bring a calm, steady pace. That makes for an easy match, though you may want to make sure decisions still get made.',
  'phlegmatic+sanguine':
    'One of you may prefer to relax and go with the flow while the other brings energy and enthusiasm. Together you may find a comfortable, easy rhythm.',
  'sanguine+sanguine':
    'You may both bring warmth and spontaneity. That means plenty of fun together, though you may want extra support following through on plans.',
};

const ENERGY_PAIRS: Record<string, string> = {
  'achiever+achiever':
    'You may both be energized by getting things done. That is a strong push toward results, though you may want to build in time to slow down together.',
  'achiever+innovator':
    'One of you may want to move fast toward a goal while the other wants to explore new ideas first. Together you may balance momentum with creativity.',
  'achiever+organizer':
    'One of you may want to just get moving while the other wants a clear plan first. Together you may combine structure with drive.',
  'achiever+unifier':
    'One of you may focus on results while the other focuses on how everyone feels. Together you may balance getting things done with staying connected.',
  'innovator+innovator':
    'You may both be drawn to new ideas and possibilities. That means plenty of creative energy together, though you may want extra support finishing what you start.',
  'innovator+organizer':
    'One of you may want to try something new while the other wants a plan first. Together you may turn fresh ideas into something workable.',
  'innovator+unifier':
    'One of you may bring new ideas while the other brings people together around them. That is a natural pairing for change that people feel good about.',
  'organizer+organizer':
    'You may both value structure and planning. That is a natural fit for keeping things running smoothly, though you may want to stay open to spontaneity too.',
  'organizer+unifier':
    'One of you may focus on structure while the other focuses on how people feel. Together you may build systems that work for everyone.',
  'unifier+unifier':
    'You may both be energized by connection and togetherness. That makes for a warm, inclusive pairing, though you may want to make sure decisions still get made.',
};

export function getTemperamentPairContent(a: TemperamentType, b: TemperamentType): string {
  return TEMPERAMENT_PAIRS[pairKey(a, b)] ?? '';
}

export function getEnergyPairContent(a: ProductivityEnergy, b: ProductivityEnergy): string {
  return ENERGY_PAIRS[pairKey(a, b)] ?? '';
}

export interface BasicComparison {
  memberAName: string;
  memberBName: string;
  temperamentBlurb: string;
  energyBlurb: string;
}

export function getBasicComparison(
  memberA: { name: string; temperament_type: TemperamentType; productivity_energy: ProductivityEnergy },
  memberB: { name: string; temperament_type: TemperamentType; productivity_energy: ProductivityEnergy },
): BasicComparison {
  return {
    memberAName: memberA.name,
    memberBName: memberB.name,
    temperamentBlurb: getTemperamentPairContent(memberA.temperament_type, memberB.temperament_type),
    energyBlurb: getEnergyPairContent(memberA.productivity_energy, memberB.productivity_energy),
  };
}