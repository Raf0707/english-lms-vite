import { describe, expect, it } from 'vitest';
import type { DictionaryEntry } from '../types';
import { calculateSm2 } from './sm2';

const entry: DictionaryEntry = {
  id: 'test',
  word: 'confidence',
  translation: 'уверенность',
  context: 'Confidence grows with practice.',
  status: 'new',
  repetitions: 0,
  interval: 0,
  easeFactor: 2.5,
  nextReviewAt: '2026-08-07T00:00:00.000Z',
  createdAt: '2026-08-07T00:00:00.000Z'
};

describe('calculateSm2', () => {
  it('назначает первый интервал в один день при успешном ответе', () => {
    const result = calculateSm2(entry, 4, new Date('2026-08-07T00:00:00.000Z'));
    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    expect(result.nextReviewAt).toBe('2026-08-08T00:00:00.000Z');
  });

  it('сбрасывает серию после неуспешного ответа', () => {
    const result = calculateSm2({ ...entry, repetitions: 4, interval: 14 }, 1);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });
});
