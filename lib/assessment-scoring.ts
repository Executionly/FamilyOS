import { AssessmentAnswer, AssessmentQuestion } from "@/types";

export interface ScoreResult {
  resultType: string;
  counts: Record<string, number>;
}

/**
 * Layer 1 (structured logic) scoring — no AI involved.
 * Tallies which category each answer maps to and returns the most
 * frequent one. Ties are broken by question order (first type to
 * reach the max count wins), which is deterministic and simple
 * enough not to need explaining to the user.
 */
export function scoreAssessment(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[],
): ScoreResult {
  const counts: Record<string, number> = {};
  const questionsById = new Map(questions.map((q) => [q.id, q]));
  const firstSeenOrder: string[] = [];

  for (const answer of answers) {
    const question = questionsById.get(answer.question_id);
    const option = question?.options[answer.selected_option_index];
    if (!option) continue;

    if (counts[option.maps_to] == null) {
      counts[option.maps_to] = 0;
      firstSeenOrder.push(option.maps_to);
    }
    counts[option.maps_to] += 1;
  }

  let resultType = firstSeenOrder[0] ?? '';
  let max = -1;
  for (const type of firstSeenOrder) {
    if (counts[type] > max) {
      max = counts[type];
      resultType = type;
    }
  }

  return { resultType, counts };
}