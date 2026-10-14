

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  MAX_REROLLS_PER_PLAYER,
  MAX_SKIPS_PER_PLAYER,
  MIN_PLAYERS,
  TdIntensity,
  TdPromptRow,
  TdStats,
  TdType,
  effectiveAgeBand,
  getStats,
  isGameOver,
  participantAtTurn,
  pickPrompt,
  shuffle,
} from '../_shared/truth-dare-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STATUS_WAITING = 'waiting';
const STATUS_IN_PROGRESS = 'in_progress';
const STATUS_COMPLETED = 'completed';
const CREATOR_COLUMN = 'created_by';
const GAME_TYPE = 'truth_dare';

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface Ctx {
  admin: SupabaseClient;
  session: Record<string, any>;
  /** The caller's game_participant row. */
  me: { id: string; member_id: string; user_id: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    // --- Authenticate the caller -------------------------------------------------------------
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) throw new HttpError(401, 'Not authenticated');
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');
    const sessionId = String(body.session_id ?? '');
    if (!action || !sessionId) throw new HttpError(400, 'action and session_id are required');

    // --- Load session + verify caller is a participant -----------------------------------------
    const { data: session, error: sessErr } = await admin
      .from('game_session')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();
    if (sessErr) throw new HttpError(500, sessErr.message);
    if (!session) throw new HttpError(404, 'Game session not found');
    if (session.game_type !== GAME_TYPE) throw new HttpError(400, 'Not a Truth or Dare session');

    // The caller's member row in the session's family
    const { data: member } = await admin
      .from('member')
      .select('id', 'user_id')
      .eq('family_id', session.family_id)
      .eq('user_id', userId)
      .maybeSingle();
      console.log("member",member)
      console.log("session",session)
    if (!member) throw new HttpError(403, 'You are not a member of this family');

    const { data: me } = await admin
      .from('game_participant')
      .select('id, member_id')
      .eq('session_id', sessionId)
      .eq('member_id', member.id)
      .maybeSingle();

    if (!me) throw new HttpError(403, 'You are not part of this game');

    const ctx: Ctx = { admin, session, me: {
        id: me.id,
        member_id: me.member_id,
        user_id: userId
    } };

    switch (action) {
      case 'start_game':
        return json(await startGame(ctx, body));
      case 'choose_type':
        return json(await chooseType(ctx, body));
      case 'reroll_prompt':
        return json(await rerollPrompt(ctx));
      case 'complete_turn':
        return json(await finishTurn(ctx, 'completed',body));
      case 'skip_turn':
        return json(await finishTurn(ctx, 'skipped'));
      case 'end_game':
        return json(await endGame(ctx));
      default:
        throw new HttpError(400, `Unknown action: ${action}`);
    }
  } catch (err) {
    if (err instanceof HttpError) return json({ ok: false, error: err.message }, err.status);
    console.error('truth-dare-action error', err);
    return json({ ok: false, error: 'Something went wrong' }, 500);
  }
});

// ================================================================================================
// Helpers
// ================================================================================================

function requireCreator({ session, me }: Ctx) {
  if (session[CREATOR_COLUMN] !== me.user_id) {
    throw new HttpError(403, 'Only the game creator can do that');
  }
}

function requireCurrentPlayer({ session, me }: Ctx) {
  if (session.td_current_participant_id !== me.id) {
    throw new HttpError(403, "It's not your turn");
  }
}

function requirePlaying({ session }: Ctx) {
  if (session.status !== STATUS_IN_PROGRESS || session.td_phase === 'game_complete') {
    throw new HttpError(409, 'This game is not in progress');
  }
}

/** Update the session only if td_turn_index and phase still match, so double taps/races are no-ops. */
async function guardedUpdate(
  ctx: Ctx,
  expected: { phase: string },
  patch: Record<string, unknown>,
) {
  const { data, error } = await ctx.admin
    .from('game_session')
    .update(patch)
    .eq('id', ctx.session.id)
    .eq('status', STATUS_IN_PROGRESS)
    .eq('td_phase', expected.phase)
    .eq('td_turn_index', ctx.session.td_turn_index)
    .select('*')
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(409, 'The game moved on. Please try again.');
  return data;
}

async function loadPrompts(
  ctx: Ctx,
  type: TdType,
  ageBand: string,
  intensity: TdIntensity,
): Promise<TdPromptRow[]> {
  let q = ctx.admin
    .from('truth_dare_prompt')
    .select('id, type, content, age_bands, intensity')
    .eq('is_active', true)
    .eq('type', type)
    .contains('age_bands', [ageBand])
    .or(`family_id.is.null,family_id.eq.${ctx.session.family_id}`)
    .limit(500);
  if (intensity === 'mild') q = q.eq('intensity', 'mild');
  const { data, error } = await q;
  if (error) throw new HttpError(500, error.message);
  return (data ?? []) as TdPromptRow[];
}

async function currentPlayerAgeBand(ctx: Ctx): Promise<string> {
  const { data: part } = await ctx.admin
    .from('game_participant')
    .select('member_id')
    .eq('id', ctx.session.td_current_participant_id)
    .maybeSingle();
  if (!part) return effectiveAgeBand(null);
  const { data: m } = await ctx.admin
    .from('member')
    .select('age_band')
    .eq('id', part.member_id)
    .maybeSingle();
  return effectiveAgeBand(m?.age_band);
}


const MAX_ANSWER_LENGTH = 500;
 
/** Trim, collapse whitespace and cap length. Empty means no answer. */
function cleanAnswer(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_ANSWER_LENGTH);
  return t.length > 0 ? t : null;
}
 
function bumpStats(stats: TdStats, participantId: string, patch: Partial<ReturnType<typeof getStats>>) {
  const current = getStats(stats, participantId);
  return { ...stats, [participantId]: { ...current, ...patch } };
}
 

// ================================================================================================
// Actions
// ================================================================================================

async function startGame(ctx: Ctx, body: Record<string, any>) {
  requireCreator(ctx);
  const { session, admin } = ctx;
  if (session.status !== STATUS_WAITING) throw new HttpError(409, 'Game already started');

  const { data: participants, error } = await admin
    .from('game_participant')
    .select('id')
    .eq('session_id', session.id);
  if (error) throw new HttpError(500, error.message);
  if (!participants || participants.length < MIN_PLAYERS) {
    throw new HttpError(400, `Need at least ${MIN_PLAYERS} players to start`);
  }

  // Length and vibe are chosen when the session is created (td_max_turns / td_intensity), so
  // start_game keeps those unless the caller explicitly overrides them.
  let intensity: TdIntensity = session.td_intensity === 'mixed' ? 'mixed' : 'mild';
  if (body.intensity === 'mixed' || body.intensity === 'mild') intensity = body.intensity;
 
  let maxTurns: number | null = session.td_max_turns ?? null;
  if (body.max_turns !== undefined) {
    if (body.max_turns === null) {
      maxTurns = null;
    } else {
      const n = Number(body.max_turns);
      if (!Number.isInteger(n) || n < 1 || n > 100) throw new HttpError(400, 'max_turns must be 1 to 100');
      maxTurns = n;
    }
  }

  const order = shuffle(participants.map((p) => p.id as string));

  // Atomic: flips status and sets up turn 1 in one write, guarded on status = waiting
  // (same fix as Family Feud's start race: clients never write status themselves).
  const { data, error: upErr } = await admin
    .from('game_session')
    .update({
      status: STATUS_IN_PROGRESS,
      td_phase: 'choosing',
      td_turn_order: order,
      td_turn_index: 0,
      td_current_participant_id: order[0],
      td_prompt_id: null,
      td_prompt_type: null,
      td_prompt_text: null,
      td_used_prompt_ids: [],
      td_stats: {},
      td_rerolled_this_turn: false,
      td_max_turns: maxTurns,
      td_intensity: intensity,
    })
    .eq('id', session.id)
    .eq('status', STATUS_WAITING)
    .select('*')
    .maybeSingle();
  if (upErr) throw new HttpError(500, upErr.message);
  if (!data) throw new HttpError(409, 'Game already started');
  return { ok: true, session: data };
}

async function chooseType(ctx: Ctx, body: Record<string, any>) {
  requirePlaying(ctx);
  requireCurrentPlayer(ctx);
  const { session } = ctx;
  if (session.td_phase !== 'choosing') throw new HttpError(409, 'You already chose');

  const type = body.type as TdType;
  if (type !== 'truth' && type !== 'dare') throw new HttpError(400, 'type must be truth or dare');

  const ageBand = await currentPlayerAgeBand(ctx);
  const intensity = (session.td_intensity ?? 'mild') as TdIntensity;
  const prompts = await loadPrompts(ctx, type, ageBand, intensity);
  const prompt = pickPrompt({
    prompts,
    type,
    ageBand: ageBand as any,
    intensity,
    usedIds: session.td_used_prompt_ids ?? [],
  });
  if (!prompt) {
    throw new HttpError(404, `No ${type} prompts available for this player. Try the other one.`);
  }

  const before = getStats(session.td_stats, ctx.me.id);
  const stats = bumpStats(
    session.td_stats ?? {},
    ctx.me.id,
    type === 'truth' ? { truths: before.truths + 1 } : { dares: before.dares + 1 },
  );

  const data = await guardedUpdate(ctx, { phase: 'choosing' }, {
    td_phase: 'performing',
    td_prompt_id: prompt.id,
    td_prompt_type: type,
    td_prompt_text: prompt.content,
    td_used_prompt_ids: [...(session.td_used_prompt_ids ?? []), prompt.id],
    td_rerolled_this_turn: false,
    td_stats: stats,
  });
  return { ok: true, session: data };
}

async function rerollPrompt(ctx: Ctx) {
  requirePlaying(ctx);
  requireCurrentPlayer(ctx);
  const { session } = ctx;
  if (session.td_phase !== 'performing') throw new HttpError(409, 'Nothing to reroll yet');
  if (session.td_rerolled_this_turn) throw new HttpError(409, 'You already rerolled this turn');

  const mine = getStats(session.td_stats, ctx.me.id);
  if (mine.rerolls >= MAX_REROLLS_PER_PLAYER) {
    throw new HttpError(409, 'No rerolls left');
  }

  const type = session.td_prompt_type as TdType;
  const ageBand = await currentPlayerAgeBand(ctx);
  const intensity = (session.td_intensity ?? 'mild') as TdIntensity;
  const prompts = await loadPrompts(ctx, type, ageBand, intensity);
  const prompt = pickPrompt({
    prompts,
    type,
    ageBand: ageBand as any,
    intensity,
    usedIds: session.td_used_prompt_ids ?? [],
    excludeId: session.td_prompt_id,
  });
  if (!prompt) throw new HttpError(404, 'No other prompts available');

  const data = await guardedUpdate(ctx, { phase: 'performing' }, {
    td_prompt_id: prompt.id,
    td_prompt_text: prompt.content,
    td_used_prompt_ids: [...(session.td_used_prompt_ids ?? []), prompt.id],
    td_rerolled_this_turn: true,
    td_stats: bumpStats(session.td_stats ?? {}, ctx.me.id, { rerolls: mine.rerolls + 1 }),
  });
  return { ok: true, session: data };
}

/** Shared by complete_turn and skip_turn: log the turn, then advance (or finish the game). */

/** Shared by complete_turn and skip_turn: log the turn, then advance (or finish the game). */
async function finishTurn(
  ctx: Ctx,
  outcome: 'completed' | 'skipped',
  body: Record<string, any> = {},
) {
  requirePlaying(ctx);
  const { session, me, admin } = ctx;
  const currentId = session.td_current_participant_id as string;
  let answer: string | null = null;
 
  if (outcome === 'completed') {
    if (session.td_phase !== 'performing') throw new HttpError(409, 'No prompt to complete');
    if (session.td_prompt_type === 'truth') {
      // A truth is answered in the app by the player themselves, so nobody else can complete it
      // (that would throw their typed answer away). The host can, to unstick an idle player.
      if (me.id !== currentId) requireCreator(ctx);
      else answer = cleanAnswer(body.answer);
    }
    // A dare is honor system: the current player, or anyone else playing, can confirm it was done.
  } else {
    // Only the current player skips, and only while a choice or prompt is pending.
    requireCurrentPlayer(ctx);
    const mine = getStats(session.td_stats, currentId);
    if (mine.skips >= MAX_SKIPS_PER_PLAYER) throw new HttpError(409, 'No skips left');
  }
 
  let stats: TdStats = session.td_stats ?? {};
  const cur = getStats(stats, currentId);
  stats = bumpStats(stats, currentId, {
    skips: outcome === 'skipped' ? cur.skips + 1 : cur.skips,
    completed: outcome === 'completed' ? cur.completed + 1 : cur.completed,
  });
 
  const nextIndex = session.td_turn_index + 1;
  const over = isGameOver(session.td_max_turns, nextIndex);
  const order: string[] = session.td_turn_order ?? [];
 
  const patch: Record<string, unknown> = {
    td_stats: stats,
    // Shown to everyone at the start of the next turn ("Last turn: ...").
    td_last_turn: {
      participant_id: currentId,
      type: session.td_prompt_type,
      prompt: session.td_prompt_text,
      answer,
      outcome,
      turn_index: session.td_turn_index,
    },
    td_turn_index: nextIndex,
    td_prompt_id: null,
    td_prompt_type: null,
    td_prompt_text: null,
    td_rerolled_this_turn: false,
  };
  if (over) {
    patch.td_phase = 'game_complete';
    patch.status = STATUS_COMPLETED;
  } else {
    patch.td_phase = 'choosing';
    patch.td_current_participant_id = participantAtTurn(order, nextIndex);
  }
 
  // The guard checks the OLD turn_index/phase, so a double tap on "Done" can't advance twice.
  const data = await guardedUpdate(ctx, { phase: session.td_phase }, patch);
 
  // Best-effort recap log (never blocks gameplay).
  await admin
    .from('truth_dare_turn')
    .insert({
      session_id: session.id,
      participant_id: currentId,
      turn_index: session.td_turn_index,
      prompt_type: session.td_prompt_type,
      prompt_text: session.td_prompt_text,
      outcome,
      answer_text: answer,
    })
    .then(({ error }) => error && console.warn('turn log failed', error.message));
 
  return { ok: true, session: data };
}
 
async function endGame(ctx: Ctx) {
  requireCreator(ctx);
  const { session, admin } = ctx;
  if (session.status === STATUS_COMPLETED) return { ok: true, session };
 
  const { data, error } = await admin
    .from('game_session')
    .update({ status: STATUS_COMPLETED, td_phase: 'game_complete' })
    .eq('id', session.id)
    .select('*')
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  return { ok: true, session: data };
}
 