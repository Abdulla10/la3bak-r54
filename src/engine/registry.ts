import { createLettersEngine } from './letters.js';
import { createMostLikelyEngine } from './mostlikely.js';
import { createOutsiderEngine } from './outsider.js';
import { createCodewordsEngine } from './codewords.js';
import { createJackaroEngine } from './jackaro.js';
import { createLudoEngine } from './ludo.js';
import { createBalootEngine } from './baloot.js';
import { createDominoEngine } from './domino.js';
import { createUnoEngine } from './uno.js';
import { createLiarsEngine } from './liars.js';
import { createPoolEngine } from './pool.js';
import { createBowlingEngine } from './bowling.js';
import { createCarromEngine } from './carrom.js';
import { createMinaboliEngine } from './minaboli.js';
import { createQuizEngines } from './quiz-games.js';
import { KIDS } from './kids.js';
import type { Engine, GameInfo } from './types.js';
import { isRetiredGame } from './retired-games.js';

/** ألعاب بدون محرك ما تنفتح لها غرف أبداً. حالياً ما فيه أي لعبة «قريباً». */
export const COMING_SOON: GameInfo[] = [];

export const GAME_CATEGORIES = [
  { id: 'party', label: 'جماعية' },
  { id: 'words', label: 'كلمات' },
  { id: 'trivia', label: 'أسئلة عامة' },
  { id: 'kids', label: 'أطفال' },
  { id: 'board', label: 'لوحية' },
  { id: 'duel', label: 'تحدي لاعبين' },
];

export function createRegistry(rng: () => number = Math.random) {
  const engines = new Map<string, Engine>();
  for (const e of [
    createLettersEngine(rng), createMostLikelyEngine(rng), createOutsiderEngine(rng), createCodewordsEngine(rng),
    createJackaroEngine(rng), createLudoEngine(rng), createBalootEngine(rng), createDominoEngine(rng), createUnoEngine(rng), createCarromEngine(rng),
    createMinaboliEngine(rng), createLiarsEngine(rng), createPoolEngine(rng), createBowlingEngine(rng),
    ...createQuizEngines(rng),
  ] as Engine[]) engines.set(e.info.id, e);
  return {
    get: (id: string) => isRetiredGame(id) ? undefined : engines.get(id),
    // Never a public/playable lookup: retained solely for old room settlement/history.
    historyEngine: (id: string) => engines.get(id),
    list: (): GameInfo[] => [...[...engines.values()].map((e) => e.info), ...COMING_SOON].filter((i) => !isRetiredGame(i.id)).map((i) => ({ ...i, kids: KIDS[i.id] })),
  };
}

export type Registry = ReturnType<typeof createRegistry>;
