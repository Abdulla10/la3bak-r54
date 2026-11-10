export interface RoomPlayer {
  id: string;
  name: string;
  bot: boolean;
  ready: boolean;
  left: boolean;
  disconnectedAt?: number;
  reconnectUntil?: number;
}

export interface Room {
  code: string;
  hostId: string;
  mode: 'friends' | 'bots';
  /** R69zm: مستوى البوتات */
  botLevel?: 'easy' | 'normal' | 'pro';
  gameId: string;
  seats: number;
  status: 'lobby' | 'playing' | 'finished';
  players: RoomPlayer[];
  state: unknown | null;
  /** Server-only request metadata; never include in a public snapshot. */
  creation?: { key: string; fingerprint: string };
  /** Server-only password verifier; never include in a public snapshot. */
  access?: { visibility: 'private'; salt: string; passwordHash: string };
  /** رقم الجولة في الغرفة (يزيد كل ما تبدأ لعبة)، تستعمله الواجهة عشان ما تسجّل نتيجة مرتين */
  gameNo?: number;
  /** رسم الدخول (عملات افتراضية) لكل لاعب في غرفة المطابقة، والذين دفعوه */
  stake?: number;
  payers?: string[];
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export type RoomCreationResult =
  | { kind: 'created' | 'replay'; room: Room }
  | { kind: 'mismatch' | 'gone' | 'room_limit' | 'bot_limit' | 'collision' };

/**
 * المخزن يحفظ الحالة الدائمة. التحديث متفائل: ما يكتب إلا إذا الإصدار المتوقع
 * هو نفسه المحفوظ، فلا تكتب حالة قديمة فوق حالة أحدث.
 */
export interface RoomStore {
  get(code: string): Promise<Room | null>;
  create(room: Room): Promise<boolean>;
  createRoomAtomic?(
    room: Room,
    key: string,
    fingerprint: string,
    limits: { maxRooms: number; maxBotRooms: number },
  ): Promise<RoomCreationResult>;
  update(room: Room, expectedRevision: number): Promise<boolean>;
  delete(code: string): Promise<void>;
  listByUser(userId: string): Promise<Room[]>;
  listPlaying(): Promise<Room[]>;
  listUpdatedBefore(ts: number): Promise<Room[]>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export class MemoryStore implements RoomStore {
  private rooms = new Map<string, Room>();
  private creationKeys = new Map<string, Map<string, { fingerprint: string; code: string; gone: boolean }>>();
  // Historical atomic-creation codes cannot identify a new atomic room.
  private creationCodes = new Set<string>();

  private copy(r: Room): Room {
    return structuredClone(r);
  }
  async get(code: string) {
    const r = this.rooms.get(code);
    return r ? this.copy(r) : null;
  }
  async create(room: Room) {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, this.copy(room));
    return true;
  }
  async createRoomAtomic(
    room: Room,
    key: string,
    fingerprint: string,
    limits: { maxRooms: number; maxBotRooms: number },
  ): Promise<RoomCreationResult> {
    // There is deliberately no await in this critical section: checks and writes
    // execute in one JS turn, even for concurrent calls with different keys.
    const actorKeys = this.creationKeys.get(room.hostId);
    const previous = actorKeys?.get(key);
    if (previous) {
      if (previous.fingerprint !== fingerprint) return { kind: 'mismatch' };
      const stored = this.rooms.get(previous.code);
      if (previous.gone || !stored) return { kind: 'gone' };
      return { kind: 'replay', room: this.copy(stored) };
    }
    const hosted = [...this.rooms.values()].filter((r) => r.hostId === room.hostId);
    if (hosted.length >= limits.maxRooms) return { kind: 'room_limit' };
    if (room.mode === 'bots' && hosted.filter((r) => r.mode === 'bots').length >= limits.maxBotRooms) {
      return { kind: 'bot_limit' };
    }
    if (this.rooms.has(room.code) || this.creationCodes.has(room.code)) return { kind: 'collision' };
    const stored = this.copy({ ...room, creation: { key, fingerprint } });
    // Clone the result before writing, so an uncloneable payload consumes neither
    // a code nor a key, and callers can never mutate the stored value.
    const result = this.copy(stored);
    const keys = actorKeys ?? new Map<string, { fingerprint: string; code: string; gone: boolean }>();
    keys.set(key, { fingerprint, code: room.code, gone: false });
    this.creationKeys.set(room.hostId, keys);
    this.creationCodes.add(room.code);
    this.rooms.set(room.code, stored);
    return { kind: 'created', room: result };
  }
  async update(room: Room, expectedRevision: number) {
    const cur = this.rooms.get(room.code);
    if (!cur || cur.revision !== expectedRevision) return false;
    this.rooms.set(room.code, this.copy(room));
    return true;
  }
  async delete(code: string) {
    this.rooms.delete(code);
    for (const keys of this.creationKeys.values()) {
      for (const entry of keys.values()) if (entry.code === code) entry.gone = true;
    }
  }
  async listByUser(userId: string) {
    return [...this.rooms.values()]
      .filter((r) => r.players.some((p) => p.id === userId && !p.bot && !p.left))
      .map((r) => this.copy(r));
  }
  async listPlaying() {
    return [...this.rooms.values()].filter((r) => r.status === 'playing').map((r) => this.copy(r));
  }
  async listUpdatedBefore(ts: number) {
    return [...this.rooms.values()].filter((r) => r.updatedAt < ts).map((r) => this.copy(r));
  }
  async ping() {
    return true;
  }
  async close() {}
}
