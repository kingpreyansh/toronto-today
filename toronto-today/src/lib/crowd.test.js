import { describe, it, expect } from 'vitest';
import { sortByCrowd } from './briefing.js';

describe('sortByCrowd', () => {
  it('puts events likely to draw a young crowd first', () => {
    const events = [
      {title: 'Quiet reading room', crowd: 'quiet'},
      {title: 'Polish festival', crowd: 'young-crowd'},
      {title: 'General market', crowd: 'general'},
      {title: 'Student union mixer', crowd: 'young-crowd'},
    ];
    const sorted = sortByCrowd(events).map(e => e.title);
    expect(sorted.slice(0, 2)).toEqual(['Polish festival', 'Student union mixer']);
    expect(sorted[3]).toBe('Quiet reading room');
  });

  it('keeps the original order for equal or unknown crowd values', () => {
    const events = [
      {title: 'A'},
      {title: 'B'},
      {title: 'C'},
    ];
    // No crowd value at all: order must be preserved, never guessed.
    expect(sortByCrowd(events).map(e => e.title)).toEqual(['A', 'B', 'C']);
    // An unrecognised value is neutral, not promoted or demoted.
    const mixed = sortByCrowd([
      {title: 'X', crowd: 'mystery'},
      {title: 'Y', crowd: 'young-crowd'},
      {title: 'Z', crowd: 'mystery'},
    ]).map(e => e.title);
    expect(mixed[0]).toBe('Y');
    expect(mixed.slice(1)).toEqual(['X', 'Z']);
  });

  it('is stable and does not mutate the input', () => {
    const events = [
      {title: 'a', crowd: 'general'},
      {title: 'b', crowd: 'general'},
      {title: 'c', crowd: 'general'},
    ];
    const copy = JSON.parse(JSON.stringify(events));
    expect(sortByCrowd(events).map(e => e.title)).toEqual(['a', 'b', 'c']);
    expect(events).toEqual(copy);
    expect(sortByCrowd([])).toEqual([]);
  });

  it('is not confused by odd crowd values', () => {
    expect(sortByCrowd([{title: 'x', crowd: null}, {title: 'y', crowd: 42}]).map(e => e.title))
      .toEqual(['x', 'y']);
    expect(sortByCrowd([{title: 'y', crowd: 'YOUNG-CROWD'}, {title: 'z', crowd: 'quiet'}]).map(e => e.title))
      .toEqual(['y', 'z']);
  });
});