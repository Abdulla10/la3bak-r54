import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** Discovery categories only: these do not select an engine, camera, auction, or financial action. */
export const ROOM_MODES_R30 = ['normal', 'social'] as const;
export const UNSUPPORTED_ROOM_MODES_R30 = ['games', 'video', 'auction'] as const;
export const ROOM_TAGS_R30 = ['friends', 'music', 'games', 'call', 'birthday'] as const;
export const ROOM_COUNTRIES_R30 = ['SA', 'AE', 'KW', 'QA', 'OM', 'BH', 'EG', 'IQ'] as const;
export const DIRECTORY_LIMIT_R30 = 50;
export type DirectoryRoomMode = typeof ROOM_MODES_R30[number];
export type DirectoryRoomTag = typeof ROOM_TAGS_R30[number] | '';
export type DirectoryCountry = typeof ROOM_COUNTRIES_R30[number] | '';
export type RoomPasswordR30 = { hash: string; salt: string };
export const validDirectoryMode = (x: unknown): x is DirectoryRoomMode => ROOM_MODES_R30.includes(x as DirectoryRoomMode);
export const validDirectoryTag = (x: unknown): x is DirectoryRoomTag => x === '' || ROOM_TAGS_R30.includes(x as typeof ROOM_TAGS_R30[number]);
export const validDirectoryCountry = (x: unknown): x is DirectoryCountry => x === '' || ROOM_COUNTRIES_R30.includes(x as typeof ROOM_COUNTRIES_R30[number]);
export function validRoomPasswordR30(x: unknown): x is RoomPasswordR30 {
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return false;
  const p = x as Record<string, unknown>;
  return Object.keys(p).length === 2 && typeof p.hash === 'string' && /^[a-f0-9]{64}$/.test(p.hash) && typeof p.salt === 'string' && /^[a-f0-9]{32}$/.test(p.salt);
}
export const validPasswordInputR30 = (x: unknown): x is string => typeof x === 'string' && x.length <= 128 && Buffer.byteLength(x, 'utf8') <= 256 && !/[\u0000-\u001f\u007f]/.test(x);

/** Fixed work/memory, asynchronous libuv derivation. Callers throttle before invoking. */
function derive(input: string, salt: string, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(input, salt, length, { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function makeRoomPasswordR30(password: string): Promise<RoomPasswordR30> {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: (await derive(password, `room-password-r30:${salt}`, 32)).toString('hex') };
}
export async function verifyRoomPasswordR30(password: string, protection: RoomPasswordR30): Promise<boolean> {
  const actual = await derive(password, `room-password-r30:${protection.salt}`, 32);
  return timingSafeEqual(actual, Buffer.from(protection.hash, 'hex'));
}
/** Keep the existing opaque 64-hex receipt shape, but never cheap-hash password guesses.
 * 128-bit fresh receipt salt + 128-bit scrypt proof. Old passwordless SHA-256 receipts are unchanged. */
export async function passwordFingerprintR30(canonicalInput: string, previous?: string): Promise<string> {
  const salt = previous ? previous.slice(0, 32) : randomBytes(16).toString('hex');
  return salt + (await derive(canonicalInput, `room-receipt-r30:${salt}`, 16)).toString('hex');
}
export function directoryCapabilitiesR30() {
  return { roomModes: [...ROOM_MODES_R30], unsupportedRoomModes: [...UNSUPPORTED_ROOM_MODES_R30], roomTags: [...ROOM_TAGS_R30], countryCodes: [...ROOM_COUNTRIES_R30], roomPassword: true, roomFollow: true, maxRecentRooms: DIRECTORY_LIMIT_R30, maxFollowedRooms: DIRECTORY_LIMIT_R30 };
}
