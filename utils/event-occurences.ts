export interface CalendarEventLike {
  id: string;
  start_date: string;
  end_date: string;
  recurrence: string;
  [key: string]: any;
}

// Given a stored event and a visible date range, returns every occurrence that falls in range —
// the original event plus any virtual future/past repeats implied by `recurrence`.
export function expandOccurrences<T extends CalendarEventLike>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date
): (T & { occurrence_date: string; is_virtual: boolean })[] {
  const baseStart = new Date(event.start_date);
  const baseEnd = new Date(event.end_date);
  const durationMs = baseEnd.getTime() - baseStart.getTime();

  if (event.recurrence === 'none' || !event.recurrence) {
    if (baseStart >= rangeStart && baseStart <= rangeEnd) {
      return [{ ...event, occurrence_date: event.start_date, is_virtual: false }];
    }
    return [];
  }

  const occurrences: (T & { occurrence_date: string; is_virtual: boolean })[] = [];
  let cursor = new Date(baseStart);
  let isFirst = true;

  const advance = (d: Date) => {
    const next = new Date(d);
    switch (event.recurrence) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'biweekly': next.setDate(next.getDate() + 14); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'bimonthly': next.setMonth(next.getMonth() + 2); break;
      case 'quaterly': next.setMonth(next.getMonth() + 3); break;
      case 'annually': next.setFullYear(next.getFullYear() + 1); break;
      default: next.setFullYear(next.getFullYear() + 100); // safety fallback, stop looping
    }
    return next;
  };

  // Walk forward from the base date until past rangeEnd (cap iterations as a safety net)
  let iterations = 0;
  while (cursor <= rangeEnd && iterations < 500) {
    if (cursor >= rangeStart) {
      const occStart = new Date(cursor);
      occurrences.push({
        ...event,
        occurrence_date: occStart.toISOString(),
        is_virtual: !isFirst,
      });
    }
    cursor = advance(cursor);
    isFirst = false;
    iterations++;
  }

  return occurrences;
}

// Expand a whole list of events against a date range in one pass
export function expandAllOccurrences<T extends CalendarEventLike>(
  events: T[],
  rangeStart: Date,
  rangeEnd: Date
): (T & { occurrence_date: string; is_virtual: boolean })[] {
  return events.flatMap((e) => expandOccurrences(e, rangeStart, rangeEnd));
}