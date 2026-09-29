import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rejectIfNotFamilyMember } from '../_shared/family-auth.ts';
import { normalizeAnswer, matchAnswer, getRoundMultiplier, type FeudAnswerRow } from '../_shared/feud-utils.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Action =
  | 'shuffle_teams'
  | 'start_round'
  | 'submit_face_off_answer'
  | 'choose_play_or_pass'
  | 'submit_turn_answer'
  | 'submit_steal_answer';

interface ActionRequest {
  session_id: string;
  member_id: string;
  action: Action;
  answer_text?: string;
  choice?: 'play' | 'pass';
}

// ── Small helpers ──────────────────────────────────────────────

async function getSession(sessionId: string) {
  const { data, error } = await supabase.from('game_session').select('*').eq('id', sessionId).single();
  if (error) throw error;
  return data;
}

async function getTeamRoster(sessionId: string, teamId: 'A' | 'B'): Promise<string[]> {
  const { data } = await supabase
    .from('game_participant')
    .select('member_id')
    .eq('session_id', sessionId)
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });
  return (data ?? []).map((p: any) => p.member_id);
}

async function getMemberTeam(sessionId: string, memberId: string): Promise<'A' | 'B' | null> {
  const { data } = await supabase
    .from('game_participant')
    .select('team_id')
    .eq('session_id', sessionId)
    .eq('member_id', memberId)
    .maybeSingle();
  return (data?.team_id as 'A' | 'B') ?? null;
}

function otherTeam(team: 'A' | 'B'): 'A' | 'B' {
  return team === 'A' ? 'B' : 'A';
}

// Player after `currentId` in `roster`, wrapping around. If currentId
// isn't found (shouldn't happen), falls back to the first player.
function nextInRoster(roster: string[], currentId: string): string {
  const idx = roster.indexOf(currentId);
  return roster[(idx + 1) % roster.length];
}

async function getAnswersForQuestion(questionId: string): Promise<FeudAnswerRow[]> {
  const { data, error } = await supabase
    .from('family_feud_answer')
    .select('id, answer, aliases, rank, points')
    .eq('question_id', questionId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return data as FeudAnswerRow[];
}

// Picks a question not yet used this session, respecting the session's
// category/difficulty filter. Falls back to ignoring the filter, then to
// allowing a repeat, rather than dead-ending the game (spec says "avoid"
// repeats, not "never allow").
async function pickNextQuestion(session: any): Promise<string> {
  const attempt = async (opts: { withFilter: boolean; allowRepeat: boolean }) => {
    let query = supabase.from('family_feud_question').select('id').eq('active', true);
    if (opts.withFilter && session.feud_category) query = query.eq('category', session.feud_category);
    if (opts.withFilter && session.feud_difficulty) query = query.eq('difficulty', session.feud_difficulty);
    if (!opts.allowRepeat && session.used_question_ids?.length) {
      query = query.not('id', 'in', `(${session.used_question_ids.join(',')})`);
    }
    const { data } = await query;
    return data ?? [];
  };

  let pool = await attempt({ withFilter: true, allowRepeat: false });
  if (!pool.length) pool = await attempt({ withFilter: false, allowRepeat: false });
  if (!pool.length) pool = await attempt({ withFilter: false, allowRepeat: true });
  if (!pool.length) throw new Error('No Family Feud questions available');

  return pool[Math.floor(Math.random() * pool.length)].id;
}

// Ends the game if this was the final round, on top of whatever
// round-ending updates the caller already built.
function finalizeIfGameOver(session: any, updates: Record<string, any>) {
  if (session.feud_round >= session.feud_total_rounds) {
    updates.feud_phase = 'game_complete';
    updates.status = 'completed';
    updates.ended_at = new Date().toISOString();
  }
  return updates;
}

// ── Action handlers ────────────────────────────────────────────

async function startRound(session: any, memberId: string) {
  const isFirstRound = session.feud_round === 0;
  if (isFirstRound) {
    if (session.status !== 'waiting') throw new Error('Session already started');
  } else if (session.status !== 'in_progress') {
    throw new Error('Session is not in progress');
  }
  if (session.feud_phase && session.feud_phase !== 'round_complete') {
    throw new Error('Round already in progress');
  }
  if (session.feud_round >= session.feud_total_rounds) throw new Error('No rounds remaining');

  const nextRound = session.feud_round + 1;
  const questionId = await pickNextQuestion(session);

  const teamA = await getTeamRoster(session.id, 'A');
  const teamB = await getTeamRoster(session.id, 'B');
  if (!teamA.length || !teamB.length) throw new Error('Both teams need at least one player');

  const faceOffA = teamA[(nextRound - 1) % teamA.length];
  const faceOffB = teamB[(nextRound - 1) % teamB.length];

  const { data, error } = await supabase
    .from('game_session')
    .update({
      status: 'in_progress',
      feud_phase: 'face_off',
      feud_round: nextRound,
      feud_question_id: questionId,
      face_off_player_ids: [faceOffA, faceOffB],
      face_off_answers: {},
      strikes: 0,
      revealed_answer_ids: [],
      round_points: 0,
      controlling_team_id: null,
      current_player_id: null,
      steal_team_id: null,
      round_winner_team_id: null,
      used_question_ids: [...(session.used_question_ids ?? []), questionId],
    })
    // Guards against a double-trigger race (e.g. two clients both react to
    // "round_complete" and both call start_round, or the creator double-taps
    // Start Game).
    .eq('feud_round', session.feud_round)
    .eq('status', session.status)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data ?? (await getSession(session.id)); // another caller won the race — return current state, not an error
}

async function submitFaceOffAnswer(session: any, memberId: string, answerText: string) {
  if (session.feud_phase !== 'face_off') throw new Error('Not in the face-off phase');
  if (!session.face_off_player_ids?.includes(memberId)) throw new Error('You are not in this face-off');
  if (session.face_off_answers?.[memberId]) throw new Error('You already answered the face-off');
  if (!answerText?.trim()) throw new Error('Answer is required');

  const answers = await getAnswersForQuestion(session.feud_question_id);
  const match = matchAnswer(answerText, answers);
  const points = match?.points ?? 0;

  const updatedAnswers = {
    ...session.face_off_answers,
    [memberId]: { text: answerText, matched_answer_id: match?.id ?? null, points },
  };

  const { data: afterSubmit, error } = await supabase
    .from('game_session')
    .update({ face_off_answers: updatedAnswers })
    .eq('id', session.id)
    .select()
    .single();
  if (error) throw error;

  const [idA, idB] = afterSubmit.face_off_player_ids;
  const ansA = afterSubmit.face_off_answers?.[idA];
  const ansB = afterSubmit.face_off_answers?.[idB];

  // Only the submission that completes the pair resolves the face-off —
  // the first submitter just waits.
  if (!ansA || !ansB) return afterSubmit;

  if (ansA.points === ansB.points) {
    // Tie (most commonly both 0, i.e. both unmatched) — burn this question
    // and re-run the face-off with a fresh one, same two players.
    const newQuestionId = await pickNextQuestion(afterSubmit);
    const { data, error: tieErr } = await supabase
      .from('game_session')
      .update({
        feud_question_id: newQuestionId,
        face_off_answers: {},
        used_question_ids: [...(afterSubmit.used_question_ids ?? []), newQuestionId],
      })
      .eq('id', session.id)
      .select()
      .single();
    if (tieErr) throw tieErr;
    return data;
  }

  const winnerId = ansA.points > ansB.points ? idA : idB;
  const winnerTeam = await getMemberTeam(session.id, winnerId);

  const { data, error: resolveErr } = await supabase
    .from('game_session')
    .update({
      feud_phase: 'play_or_pass',
      controlling_team_id: winnerTeam,
      current_player_id: winnerId, // face-off winner makes the play/pass call
    })
    .eq('id', session.id)
    .select()
    .single();
  if (resolveErr) throw resolveErr;
  return data;
}

async function choosePlayOrPass(session: any, memberId: string, choice: 'play' | 'pass') {
  if (session.feud_phase !== 'play_or_pass') throw new Error('Not awaiting a play/pass decision');
  if (session.current_player_id !== memberId) throw new Error('Not your decision to make');

  const controllingTeam: 'A' | 'B' =
    choice === 'pass' ? otherTeam(session.controlling_team_id) : session.controlling_team_id;

  // The face-off rep for whichever team ends up in control this round —
  // "next player" starts right after them.
  let controllingFaceOffRep = session.face_off_player_ids[0];
  for (const id of session.face_off_player_ids) {
    const t = await getMemberTeam(session.id, id);
    if (t === controllingTeam) {
      controllingFaceOffRep = id;
      break;
    }
  }

  const roster = await getTeamRoster(session.id, controllingTeam);
  const startingPlayer = nextInRoster(roster, controllingFaceOffRep);

  const { data, error } = await supabase
    .from('game_session')
    .update({
      feud_phase: 'playing',
      controlling_team_id: controllingTeam,
      current_player_id: startingPlayer,
    })
    .eq('id', session.id)
    .eq('feud_phase', 'play_or_pass')
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ?? (await getSession(session.id));
}

async function submitTurnAnswer(session: any, memberId: string, answerText: string) {
  if (session.feud_phase !== 'playing') throw new Error('Not currently playing a turn');
  if (session.current_player_id !== memberId) throw new Error('Not your turn');
  if (!answerText?.trim()) throw new Error('Answer is required');

  const allAnswers = await getAnswersForQuestion(session.feud_question_id);
  const revealedIds: string[] = session.revealed_answer_ids ?? [];
  const match = matchAnswer(answerText, allAnswers);

  const roster = await getTeamRoster(session.id, session.controlling_team_id);

  // No match anywhere in the answer bank — wrong answer, strike.
  if (!match) {
    const strikes = session.strikes + 1;
    if (strikes >= 3) {
      const stealTeam = otherTeam(session.controlling_team_id);
      let stealRep = session.face_off_player_ids[0];
      for (const id of session.face_off_player_ids) {
        const t = await getMemberTeam(session.id, id);
        if (t === stealTeam) {
          stealRep = id;
          break;
        }
      }
      const { data, error } = await supabase
        .from('game_session')
        .update({ strikes, feud_phase: 'steal', steal_team_id: stealTeam, current_player_id: stealRep })
        .eq('id', session.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabase
      .from('game_session')
      .update({ strikes, current_player_id: nextInRoster(roster, memberId) })
      .eq('id', session.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Matched, but already revealed — duplicate. Consume the turn, no strike,
  // no points (spec section 13).
  if (revealedIds.includes(match.id)) {
    const { data, error } = await supabase
      .from('game_session')
      .update({ current_player_id: nextInRoster(roster, memberId) })
      .eq('id', session.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Correct, new answer.
  const multiplier = getRoundMultiplier(session.feud_round, session.feud_total_rounds);
  const newRevealed = [...revealedIds, match.id];
  const newRoundPoints = session.round_points + match.points * multiplier;
  const fullyCleared = newRevealed.length === allAnswers.length;

  if (fullyCleared) {
    const teamScores = { ...session.team_scores };
    teamScores[session.controlling_team_id] = (teamScores[session.controlling_team_id] ?? 0) + newRoundPoints;
    const updates = finalizeIfGameOver(session, {
      revealed_answer_ids: newRevealed,
      round_points: newRoundPoints,
      team_scores: teamScores,
      feud_phase: 'round_complete',
      round_winner_team_id: session.controlling_team_id,
    });
    const { data, error } = await supabase.from('game_session').update(updates).eq('id', session.id).select().single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('game_session')
    .update({
      revealed_answer_ids: newRevealed,
      round_points: newRoundPoints,
      current_player_id: nextInRoster(roster, memberId),
    })
    .eq('id', session.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function submitStealAnswer(session: any, memberId: string, answerText: string) {
  if (session.feud_phase !== 'steal') throw new Error('Not in the steal phase');
  if (session.current_player_id !== memberId) throw new Error('Not your steal attempt');
  if (!answerText?.trim()) throw new Error('Answer is required');

  const allAnswers = await getAnswersForQuestion(session.feud_question_id);
  const revealedIds: string[] = session.revealed_answer_ids ?? [];
  const unrevealed = allAnswers.filter((a) => !revealedIds.includes(a.id));
  const match = matchAnswer(answerText, unrevealed);

  const teamScores = { ...session.team_scores };
  let winner: 'A' | 'B';
  let newRevealed = revealedIds;

  if (match) {
    winner = session.steal_team_id;
    teamScores[winner] = (teamScores[winner] ?? 0) + session.round_points; // entire accumulated total, not the answer's own points
    newRevealed = [...revealedIds, match.id];
  } else {
    winner = session.controlling_team_id;
    teamScores[winner] = (teamScores[winner] ?? 0) + session.round_points;
  }

  const updates = finalizeIfGameOver(session, {
    revealed_answer_ids: newRevealed,
    team_scores: teamScores,
    feud_phase: 'round_complete',
    round_winner_team_id: winner,
  });

  const { data, error } = await supabase.from('game_session').update(updates).eq('id', session.id).select().single();
  if (error) throw error;
  return data;
}

// Lobby-only. Runs with the service role so the creator can write other
// members' team_id rows, which client-side RLS may not allow.
async function shuffleTeams(session: any, memberId: string) {
  if (session.status !== 'waiting') throw new Error('Teams are locked once the game has started');

  // created_by is the auth user id, so compare against the caller's member.user_id.
  const { data: member } = await supabase.from('member').select('user_id').eq('id', memberId).single();
  if (!member || member.user_id !== session.created_by) {
    throw new Error('Only the game creator can assign teams');
  }

  const { data: participants, error } = await supabase
    .from('game_participant')
    .select('id')
    .eq('session_id', session.id);
  if (error) throw error;

  const ids = (participants ?? []).map((p: any) => p.id as string);
  if (ids.length < 2) throw new Error('Need at least 2 players to form teams');

  // Fisher-Yates, then alternate A/B so the teams end up as even as possible.
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const results = await Promise.all(
    ids.map((id, i) =>
      supabase.from('game_participant').update({ team_id: i % 2 === 0 ? 'A' : 'B' }).eq('id', id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  return session;
}

// ── Dispatch ────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const body: ActionRequest = await req.json();
    const { session_id, member_id, action } = body;
    if (!session_id || !member_id || !action) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const session = await getSession(session_id);
    const denied = await rejectIfNotFamilyMember(req, session.family_id);
    if (denied) return denied;

    // Not just family membership — must actually be a participant in this
    // specific game. (Checks the row exists rather than a team being set,
    // since nobody has a team yet while the lobby is open.)
    const { data: participantRow } = await supabase
      .from('game_participant')
      .select('id')
      .eq('session_id', session_id)
      .eq('member_id', member_id)
      .maybeSingle();
    if (!participantRow) return json({ error: 'You are not a participant in this game' }, 403);

    let result;
    switch (action) {
      case 'shuffle_teams':
        result = await shuffleTeams(session, member_id);
        break;
      case 'start_round':
        result = await startRound(session, member_id);
        break;
      case 'submit_face_off_answer':
        result = await submitFaceOffAnswer(session, member_id, body.answer_text ?? '');
        break;
      case 'choose_play_or_pass':
        if (body.choice !== 'play' && body.choice !== 'pass') return json({ error: 'Invalid choice' }, 400);
        result = await choosePlayOrPass(session, member_id, body.choice);
        break;
      case 'submit_turn_answer':
        result = await submitTurnAnswer(session, member_id, body.answer_text ?? '');
        break;
      case 'submit_steal_answer':
        result = await submitStealAnswer(session, member_id, body.answer_text ?? '');
        break;
      default:
        return json({ error: 'Unknown action' }, 400);
    }

    return json({ session: result });
  } catch (err) {
    console.error('family-feud-action error:', err);
    return json({ error: (err as Error).message }, 400);
  }
});