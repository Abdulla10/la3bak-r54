import { validProgressConfig } from './progression.js';
import type { CanonicalProgressEvent, ProgressConfig, Progression, ProgressSystem } from './progression.js';

export interface GameProgressionPlayer { id: string; name?: string }
export interface ProgressionEventResult { applied: number; skipped: number }
type RewardConfig = Record<string, unknown>;
type EventName = 'giftSent' | 'giftReceived';
type RewardAmounts = Partial<Record<ProgressSystem, number>>;

/** Existing owner-approved defaults only. Explicit eventRules updates are required to change them. */
export const APPROVED_EVENT_REWARDS = {
  gamePlayed: { vip: 2, noble: 1 }, gameWon: { vip: 10, noble: 5 },
  giftSent: { vip: 1, noble: 0 }, giftReceived: { vip: 1, noble: 0 },
} as const;
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0 && v <= 1_000_000_000;
const validId = (v: unknown): v is string => typeof v === 'string' && !!v && v.length <= 180 && !['__proto__', 'constructor', 'prototype'].includes(v);
const validRef = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9:_-]{1,80}$/.test(v);
function validate(config: ProgressConfig, ref: string, ts: number) {
  if (!validProgressConfig(config) || !validRef(ref) || !Number.isSafeInteger(ts) || ts < 0) throw new Error('progression_event_invalid');
}
/** Legacy gift LEVEL policy only. Accounts remains the sole source of game LEVEL XP. */
function giftLevel(config: ProgressConfig, event: EventName): number | undefined {
  const rewards = config.rewards as RewardConfig;
  const aliases: Record<EventName, string[]> = { giftSent: ['giftSent', 'gift.sent'], giftReceived: ['giftReceived', 'gift.received'] };
  for (const key of aliases[event]) {
    const parts = key.split('.');
    const raw = parts.length === 2 && rewards[parts[0]] && typeof rewards[parts[0]] === 'object'
      ? (rewards[parts[0]] as RewardConfig)[parts[1]] : rewards[key];
    if (positive(raw)) return raw;
    if (raw && typeof raw === 'object' && positive((raw as RewardConfig).level)) return (raw as RewardConfig).level as number;
  }
  return undefined;
}
function amounts(config: ProgressConfig, input: RewardAmounts): Record<ProgressSystem, number> {
  return { level: config.level.enabled && positive(input.level) ? input.level : 0,
    vip: config.vip.enabled && positive(input.vip) ? input.vip : 0,
    noble: config.noble.enabled && positive(input.noble) ? input.noble : 0 };
}

/** Trusted server-confirmed humans only. This class is never a public amount-taking endpoint. */
export class ProgressionEvents {
  constructor(private readonly progression: Progression,
    private readonly applyFrozen?: (events: CanonicalProgressEvent[]) => ProgressionEventResult) {}
  private apply(events: CanonicalProgressEvent[]): ProgressionEventResult {
    return this.applyFrozen ? this.applyFrozen(events) : this.progression.recordCanonicalEvents(events);
  }
  private prepared(id: string, kind: 'game' | 'gift', ref: string, outcome: CanonicalProgressEvent['outcome'], ts: number,
    fresh: Record<ProgressSystem, number>): CanonicalProgressEvent {
    const saved = this.progression.eventSnapshot(id, kind, ref);
    if (saved) {
      if (saved.outcome !== outcome) throw new Error('progression_grant_conflict');
      return saved; // Original source timestamp, amounts and zeroes survive policy edits and restarts.
    }
    const records = this.progression.eventRecords(id).filter((r) => r.kind === kind && r.ref.startsWith(`${ref}:`));
    const fixed = records.filter((r) => r.ref === `${ref}:${r.system}`);
    if (fixed.length) {
      // Old v1 fixed-key records are authoritative: do not fill systems that were disabled/zero at the time.
      if (kind === 'game' && fixed.some((record) => (record.reason === 'نهاية مباراة: فوز' && outcome !== 'won')
        || (record.reason === 'نهاية مباراة: مشاركة' && outcome !== 'played'))) throw new Error('progression_grant_conflict');
      const historical = { level: 0, vip: 0, noble: 0 };
      for (const record of fixed) historical[record.system] = record.points;
      if (kind === 'game') historical.level = 0;
      return { id, kind, ref, outcome, ts: fixed[0].ts, amounts: historical };
    }
    return { id, kind, ref, outcome, ts, amounts: fresh };
  }
  game(config: ProgressConfig, players: GameProgressionPlayer[], winners: string[], ref: string, ts = Date.now()): ProgressionEventResult {
    validate(config, ref, ts);
    if (!Array.isArray(players) || players.some((p) => !p || !validId(p.id)) || !Array.isArray(winners) || winners.some((id) => !validId(id))) throw new Error('progression_event_invalid');
    const events: CanonicalProgressEvent[] = [], winnerSet = new Set(winners);
    for (const id of new Set(players.map((player) => player.id))) {
      const won = winnerSet.has(id), event = won ? 'gameWon' : 'gamePlayed';
      const recorded = new Set(this.progression.eventRecords(id).filter((r) => r.kind === 'game'
        && (r.ref === `game:${ref}:played:${r.system}` || r.ref === `game:${ref}:won:${r.system}`)).map((r) => r.system));
      const fresh = amounts(config, (config.eventRules ?? APPROVED_EVENT_REWARDS)[event]);
      // Legacy played+won snapshots must not be retro-awarded or rewritten just by replaying a callback.
      for (const system of recorded) fresh[system] = 0;
      if (recorded.size && Object.values(fresh).every((points) => points === 0)) continue;
      events.push(this.prepared(id, 'game', `game:${ref}`, won ? 'won' : 'played', ts, fresh));
    }
    return this.apply(events);
  }
  gift(config: ProgressConfig, id: string, direction: 'sent' | 'received', ref: string, ts = Date.now()): ProgressionEventResult {
    validate(config, ref, ts);
    if (!validId(id) || !['sent', 'received'].includes(direction)) throw new Error('progression_event_invalid');
    const event = direction === 'sent' ? 'giftSent' : 'giftReceived';
    const fresh = amounts(config, { ...(config.eventRules ?? APPROVED_EVENT_REWARDS)[event], level: giftLevel(config, event) });
    return this.apply([this.prepared(id, 'gift', `gift:${ref}:${direction}:${id}`, direction, ts, fresh)]);
  }
}
