import type { DictionaryEntry } from '../types';

export interface Sm2Result {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewAt: string;
  status: DictionaryEntry['status'];
}

export function calculateSm2(entry: DictionaryEntry, quality: number, now = new Date()): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let repetitions = entry.repetitions;
  let interval = entry.interval;
  let easeFactor = entry.easeFactor;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.max(1, Math.round(interval * easeFactor));
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const next = new Date(now);
  next.setDate(next.getDate() + interval);

  return {
    repetitions,
    interval,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewAt: next.toISOString(),
    status: repetitions >= 5 ? 'mastered' : repetitions === 0 ? 'learning' : 'review'
  };
}
