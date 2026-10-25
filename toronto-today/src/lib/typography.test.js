import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Guards the "subtext is too small" regression at the source of truth, so it
// cannot creep back in through a new rule.
const css = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'styles.css'), 'utf8');

describe('readable type scale', () => {
  it('declares no font size below 13px', () => {
    const offenders = [...css.matchAll(/font-size:\s*([0-9.]+)px/g)]
      .map(m => Number(m[1]))
      .filter(size => size < 13);
    expect(offenders, `found px font sizes under 13px: ${offenders.join(', ')}`).toEqual([]);
  });

  it('keeps body and subtext at a comfortable size', () => {
    // body must be at least 16px, and be overridden to the readable scale.
    const bodySizes = [...css.matchAll(/(?:^|[\n{;,])body\{[^}]*font-size:\s*([0-9.]+)px/g)].map(m => Number(m[1]));
    expect(Math.max(...bodySizes)).toBeGreaterThanOrEqual(16);
  });

  it('does not use sub-12px text even in print or reduced layouts', () => {
    const tiny = [...css.matchAll(/font-size:\s*([0-9.]+)px/g)].map(m => Number(m[1])).filter(n => n < 13);
    expect(tiny).toEqual([]);
  });
});
