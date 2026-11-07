import { randomUUID } from 'node:crypto';
/** Council-local social utilities. No engine, wallet, value, award, media or scheduler dependency. */
export const ROOM_TOOL_IDS_R33 = ['drawing', 'timer'];
// Historical state and receipt validation only; removed tools cannot be invoked.
const STORED_ROOM_TOOL_IDS_R33 = ['dice', 'drawing', 'timer'];
export const DRAW_COLORS_R33 = ['#202124', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];
export const ROOM_TOOL_LIMITS_R33 = Object.freeze({ diceHistory: 30, strokePoints: 128, strokes: 100, totalPoints: 6400, timerSeconds: 3600 });
const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const exact = (x, names) => Object.keys(x).length === names.length && names.every(k => Object.hasOwn(x, k));
const integer = (x, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(x) && x >= min && x <= max;
const uuid = (x) => typeof x === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const ident = (x) => typeof x === 'string' && x.length > 0 && x.length <= 128 && !/[\s\u0000-\u001f\u007f]/.test(x) && !['__proto__', 'constructor', 'prototype'].includes(x);
const toolId = (x) => ROOM_TOOL_IDS_R33.includes(x);
const dense = (x, max) => Array.isArray(x) && x.length <= max && Object.keys(x).length === x.length;
const point = (x) => obj(x) && exact(x, ['x', 'y']) && [x.x, x.y].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
const points = (x) => dense(x, ROOM_TOOL_LIMITS_R33.strokePoints) && x.length >= 1 && x.every(point);
const color = (x) => DRAW_COLORS_R33.includes(x);
const deny = (error, status = 400) => ({ ok: false, error, status });
const idleTimer = () => ({ status: 'idle', durationMs: 0, remainingMs: 0, endsAt: null, updatedAt: 0 });
export function initialRoomToolsR33() {
    return { v: 1, revision: 0, updatedAt: 0, enabled: { dice: false, drawing: false, timer: false }, dice: { history: [] }, drawing: { boardVersion: 0, strokes: [] }, timer: idleTimer() };
}
function validTimer(x) {
    if (!obj(x) || !exact(x, ['status', 'durationMs', 'remainingMs', 'endsAt', 'updatedAt']) || !integer(x.durationMs, 0, ROOM_TOOL_LIMITS_R33.timerSeconds * 1000) || !integer(x.remainingMs, 0, x.durationMs) || !integer(x.updatedAt))
        return false;
    if (x.status === 'idle')
        return x.endsAt === null && x.durationMs === 0 && x.remainingMs === 0;
    if (!integer(x.durationMs, 1000) || !integer(x.remainingMs, 1))
        return false;
    return x.status === 'paused' ? x.endsAt === null : x.status === 'running' && integer(x.endsAt) && x.endsAt === x.updatedAt + x.remainingMs;
}
export function validRoomToolsR33(x) {
    if (!obj(x) || !exact(x, ['v', 'revision', 'updatedAt', 'enabled', 'dice', 'drawing', 'timer']) || x.v !== 1 || !integer(x.revision) || !integer(x.updatedAt) || !obj(x.enabled) || !exact(x.enabled, STORED_ROOM_TOOL_IDS_R33) || !Object.values(x.enabled).every(v => typeof v === 'boolean') || !obj(x.dice) || !exact(x.dice, ['history']) || !dense(x.dice.history, ROOM_TOOL_LIMITS_R33.diceHistory) || !obj(x.drawing) || !exact(x.drawing, ['boardVersion', 'strokes']) || !integer(x.drawing.boardVersion) || !dense(x.drawing.strokes, ROOM_TOOL_LIMITS_R33.strokes) || !validTimer(x.timer) || x.timer.updatedAt > x.updatedAt || !x.enabled.timer && x.timer.status === 'running')
        return false;
    const ids = new Set();
    let lastAt = 0, total = 0;
    for (const r of x.dice.history) {
        if (!obj(r) || !exact(r, ['id', 'authorId', 'value', 'at']) || !uuid(r.id) || ids.has(r.id) || !ident(r.authorId) || !integer(r.value, 1, 6) || !integer(r.at, lastAt, x.updatedAt))
            return false;
        ids.add(r.id);
        lastAt = r.at;
    }
    lastAt = 0;
    for (const s of x.drawing.strokes) {
        if (!obj(s) || !exact(s, ['id', 'authorId', 'at', 'color', 'points']) || !uuid(s.id) || ids.has(s.id) || !ident(s.authorId) || !integer(s.at, lastAt, x.updatedAt) || !color(s.color) || !points(s.points))
            return false;
        total += s.points.length;
        if (total > ROOM_TOOL_LIMITS_R33.totalPoints)
            return false;
        ids.add(s.id);
        lastAt = s.at;
    }
    return true;
}
function access(ctx) {
    if (!integer(ctx.now) || !ident(ctx.actorId) || !uuid(ctx.roomId) || !uuid(ctx.councilId))
        return deny('invalid_tool_context');
    if (!ctx.member || ctx.currentRoomId !== ctx.roomId || ctx.currentCouncilId !== ctx.councilId)
        return deny('council_membership_required', 403);
    if (ctx.eligible !== true)
        return deny('social_ineligible', 403);
    if (ctx.scopeAllowed !== true)
        return deny('tool_scope_denied', 403);
    return null;
}
function timerRemaining(timer, now) { return timer.status === 'running' ? Math.max(0, timer.endsAt - now) : timer.remainingMs; }
function pauseTimer(timer, now) {
    const remainingMs = timerRemaining(timer, now);
    return remainingMs ? { ...timer, status: 'paused', remainingMs, endsAt: null, updatedAt: now } : { ...idleTimer(), updatedAt: now };
}
/** Mutates only after complete validation; caller must use a detached tx draft and persist before publishing. */
export function applyRoomToolR33(state, command, body, ctx) {
    if (command !== 'tool:set' && command !== 'tool:action')
        return deny('invalid_tool_command');
    if (!validRoomToolsR33(state))
        return deny('invalid_tool_state', 503);
    const denied = access(ctx);
    if (denied)
        return denied;
    if (ctx.muted)
        return deny('member_muted', 403);
    if (ctx.canWrite !== true)
        return deny('chat_policy_denied', 403);
    if (ctx.now < state.updatedAt)
        return deny('tool_clock_regressed', 409);
    if (state.revision === Number.MAX_SAFE_INTEGER)
        return deny('tool_revision_capacity', 409);
    if (!obj(body) || !exact(body, command === 'tool:set' ? ['roomId', 'councilId', 'tool', 'enabled'] : ['roomId', 'councilId', 'tool', 'action']) || body.roomId !== ctx.roomId || body.councilId !== ctx.councilId || !toolId(body.tool))
        return deny('invalid_tool_command');
    const tool = body.tool;
    let result;
    if (command === 'tool:set') {
        if (ctx.moderator !== true)
            return deny('moderator_required', 403);
        if (typeof body.enabled !== 'boolean')
            return deny('invalid_tool_command');
        if (tool === 'drawing' && state.drawing.boardVersion === Number.MAX_SAFE_INTEGER)
            return deny('drawing_version_capacity', 409);
        if (tool === 'timer' && !body.enabled && state.timer.status === 'running')
            state.timer = pauseTimer(state.timer, ctx.now);
        if (tool === 'drawing')
            state.drawing.boardVersion++;
        state.enabled[tool] = body.enabled;
        result = { tool, type: 'set', enabled: body.enabled };
    }
    else {
        if (!state.enabled[tool])
            return deny('council_tool_disabled', 403);
        if (!obj(body.action) || typeof body.action.type !== 'string')
            return deny('invalid_tool_action');
        const a = body.action;
        if (tool === 'timer') {
            if (ctx.moderator !== true)
                return deny('moderator_required', 403);
            const t = state.timer;
            if (a.type === 'start') {
                if (!exact(a, ['type', 'durationSeconds']) || !integer(a.durationSeconds, 1, ROOM_TOOL_LIMITS_R33.timerSeconds))
                    return deny('invalid_tool_action');
                if (t.status === 'running' && timerRemaining(t, ctx.now) > 0)
                    return deny('timer_in_progress', 409);
                const durationMs = a.durationSeconds * 1000;
                if (!integer(ctx.now + durationMs))
                    return deny('invalid_tool_clock');
                state.timer = { status: 'running', durationMs, remainingMs: durationMs, endsAt: ctx.now + durationMs, updatedAt: ctx.now };
            }
            else if (a.type === 'resume') {
                if (!exact(a, ['type']))
                    return deny('invalid_tool_action');
                if (t.status !== 'paused')
                    return deny('timer_not_paused', 409);
                if (!integer(ctx.now + t.remainingMs))
                    return deny('invalid_tool_clock');
                state.timer = { ...t, status: 'running', endsAt: ctx.now + t.remainingMs, updatedAt: ctx.now };
            }
            else if (a.type === 'pause') {
                if (!exact(a, ['type']))
                    return deny('invalid_tool_action');
                if (t.status !== 'running' || timerRemaining(t, ctx.now) === 0)
                    return deny('timer_not_running', 409);
                state.timer = pauseTimer(t, ctx.now);
            }
            else if (a.type === 'reset') {
                if (!exact(a, ['type']))
                    return deny('invalid_tool_action');
                state.timer = { ...idleTimer(), updatedAt: ctx.now };
            }
            else
                return deny('invalid_tool_action');
            result = { tool, type: a.type, ...state.timer };
        }
        else {
            const drawing = state.drawing;
            if (a.type === 'stroke') {
                if (!exact(a, ['type', 'boardVersion', 'color', 'points']) || !integer(a.boardVersion) || !color(a.color) || !points(a.points))
                    return deny('invalid_tool_action');
                if (a.boardVersion !== drawing.boardVersion)
                    return deny('drawing_board_changed', 409);
                if (drawing.strokes.length >= ROOM_TOOL_LIMITS_R33.strokes || drawing.strokes.reduce((n, s) => n + s.points.length, 0) + a.points.length > ROOM_TOOL_LIMITS_R33.totalPoints)
                    return deny('drawing_capacity', 409);
                const stroke = { id: randomUUID(), authorId: ctx.actorId, at: ctx.now, color: a.color, points: a.points.map(p => ({ x: p.x, y: p.y })) };
                drawing.strokes.push(stroke);
                result = { tool, type: 'stroke', id: stroke.id, at: stroke.at, boardVersion: drawing.boardVersion };
            }
            else if (a.type === 'undo') {
                if (!exact(a, ['type', 'strokeId']) || !uuid(a.strokeId))
                    return deny('invalid_tool_action');
                const stroke = drawing.strokes.find(s => s.id === a.strokeId);
                if (!stroke)
                    return deny('drawing_stroke_not_found', 404);
                if (stroke.authorId !== ctx.actorId)
                    return deny('drawing_own_stroke_required', 403);
                drawing.strokes = drawing.strokes.filter(s => s.id !== a.strokeId);
                result = { tool, type: 'undo', id: stroke.id, boardVersion: drawing.boardVersion };
            }
            else if (a.type === 'clear') {
                if (!exact(a, ['type']))
                    return deny('invalid_tool_action');
                if (ctx.moderator !== true)
                    return deny('moderator_required', 403);
                if (drawing.boardVersion === Number.MAX_SAFE_INTEGER)
                    return deny('drawing_version_capacity', 409);
                drawing.strokes = [];
                drawing.boardVersion++;
                result = { tool, type: 'clear', boardVersion: drawing.boardVersion };
            }
            else
                return deny('invalid_tool_action');
        }
    }
    state.revision++;
    state.updatedAt = ctx.now;
    return { ok: true, event: `tool:${tool}:${result.type}`, toolResult: result };
}
/** Receipt result metadata only; no internal authors or client-chosen timestamps/results. */
export function validRoomToolResultR33(x) {
    if (!obj(x) || !STORED_ROOM_TOOL_IDS_R33.includes(x.tool))
        return false;
    if (x.type === 'set')
        return exact(x, ['tool', 'type', 'enabled']) && typeof x.enabled === 'boolean';
    if (x.tool === 'dice')
        return x.type === 'roll' && exact(x, ['tool', 'type', 'id', 'value', 'at']) && uuid(x.id) && integer(x.value, 1, 6) && integer(x.at);
    if (x.tool === 'timer') {
        if (!['start', 'resume', 'pause', 'reset'].includes(x.type) || !exact(x, ['tool', 'type', 'status', 'durationMs', 'remainingMs', 'endsAt', 'updatedAt']))
            return false;
        const { tool: _tool, type: _type, ...timer } = x;
        return validTimer(timer) && (x.type === 'reset' ? x.status === 'idle' : x.type === 'pause' ? x.status === 'paused' : x.status === 'running');
    }
    return x.type === 'stroke' ? exact(x, ['tool', 'type', 'id', 'at', 'boardVersion']) && uuid(x.id) && integer(x.at) && integer(x.boardVersion) : x.type === 'undo' ? exact(x, ['tool', 'type', 'id', 'boardVersion']) && uuid(x.id) && integer(x.boardVersion) : x.type === 'clear' && exact(x, ['tool', 'type', 'boardVersion']) && integer(x.boardVersion);
}
/** Pure allowlisted projection. Default state never silently migrates or writes legacy councils. */
export function projectRoomToolsR33(state, ctx) {
    if (access(ctx) || state !== undefined && !validRoomToolsR33(state))
        return null;
    const s = state ?? initialRoomToolsR33(), visible = (id) => !ctx.authorVisible || ctx.authorVisible(id) === true;
    const remainingMs = timerRemaining(s.timer, ctx.now), status = s.timer.status === 'running' && remainingMs === 0 ? 'finished' : s.timer.status;
    return {
        v: 1, revision: s.revision, serverNow: ctx.now, enabled: { drawing: s.enabled.drawing, timer: s.enabled.timer }, canWrite: ctx.canWrite === true && !ctx.muted, canManage: ctx.moderator === true && ctx.canWrite === true && !ctx.muted,
        limits: { strokePoints: ROOM_TOOL_LIMITS_R33.strokePoints, strokes: ROOM_TOOL_LIMITS_R33.strokes, totalPoints: ROOM_TOOL_LIMITS_R33.totalPoints, timerSeconds: ROOM_TOOL_LIMITS_R33.timerSeconds }, colors: [...DRAW_COLORS_R33],
        drawing: s.enabled.drawing ? { boardVersion: s.drawing.boardVersion, strokes: s.drawing.strokes.filter(r => visible(r.authorId)).map(r => ({ id: r.id, at: r.at, mine: r.authorId === ctx.actorId, color: r.color, points: r.points.map(p => ({ ...p })) })) } : null,
        timer: s.enabled.timer ? { status, durationMs: s.timer.durationMs, remainingMs, endsAt: s.timer.endsAt, updatedAt: s.timer.updatedAt } : null,
    };
}
