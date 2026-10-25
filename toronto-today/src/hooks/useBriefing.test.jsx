import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const hooks = await import('./useBriefing.js').catch(() => ({}));
it('polls every five minutes and throttles focus refreshes to one per minute', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockResolvedValue({ok:true, json:async () => edition});
  vi.stubGlobal('fetch', fetcher);
  const {unmount} = renderHook(() => hooks.useBriefing());
  await act(async () => {});
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => { vi.advanceTimersByTime(60_000); window.dispatchEvent(new Event('focus')); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async () => { window.dispatchEvent(new Event('focus')); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  await act(async () => { vi.advanceTimersByTime(240_000); });
  expect(fetcher).toHaveBeenCalledTimes(3);
  unmount();
  await act(async () => { vi.advanceTimersByTime(300_000); window.dispatchEvent(new Event('focus')); });
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it('times out a stalled request and allows a retry', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
  vi.stubGlobal('fetch', fetcher);
  const {result} = renderHook(() => hooks.useBriefing());
  await act(async () => { vi.advanceTimersByTime(12_000); });
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toBeTruthy();
  expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  fetcher.mockResolvedValue({ok:true, json:async () => edition});
  await act(async () => { await result.current.refresh(); });
  expect(result.current.data.meta.date_iso).toBe('2026-09-01');
});

const edition = { schema_version: 1, meta: {date_iso:'2026-09-01', content_note:'Test edition'} };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('loads a no-store edition and retains it when a manual refresh fails, then retries', async () => {
  expect(hooks.useBriefing).toBeTypeOf('function');
  const fetcher = vi.fn().mockResolvedValue({ok:true, json:async () => edition});
  vi.stubGlobal('fetch', fetcher);
  const {result} = renderHook(() => hooks.useBriefing());
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data?.meta.date_iso).toBe('2026-09-01'));
  expect(fetcher).toHaveBeenCalledWith('/data/latest.json', expect.objectContaining({cache:'no-store',signal:expect.any(AbortSignal)}));
  fetcher.mockRejectedValueOnce(new Error('Offline'));
  await act(async () => { await result.current.refresh(); });
  expect(result.current.data.meta.date_iso).toBe('2026-09-01');
  expect(result.current.error).toBeTruthy();
  await act(async () => { await result.current.refresh(); });
  expect(result.current.error).toBe('');
});
