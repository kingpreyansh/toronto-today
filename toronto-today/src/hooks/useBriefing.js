import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeBriefing } from '../lib/briefing';

export function useBriefing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkedAt, setCheckedAt] = useState(null);
  const request = useRef(null);
  const mounted = useRef(false);
  const lastAttempt = useRef(0);

  const refresh = useCallback(async () => {
    if (request.current) return;
    lastAttempt.current = Date.now();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    let timer;
    try {
      const fetchEdition = async () => {
        const response = await fetch('/data/latest.json', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('The briefing feed is unavailable.');
        return normalizeBriefing(await response.json());
      };
      const timeout = new Promise((_, reject) => {
        timer = window.setTimeout(() => { controller.abort(); reject(new Error('Request timed out.')); }, 12_000);
      });
      const next = await Promise.race([fetchEdition(), timeout]);
      if (mounted.current && !controller.signal.aborted) {
        setData(next);
        setError('');
        setCheckedAt(new Date());
      }
    } catch {
      if (mounted.current && request.current === controller) setError('Could not refresh the briefing. Check your connection and try again.');
    } finally {
      window.clearTimeout(timer);
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const interval = window.setInterval(refresh, 300_000);
    const onFocus = () => { if (Date.now() - lastAttempt.current >= 60_000) refresh(); };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      mounted.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [refresh]);

  return { data, loading, error, checkedAt, refresh };
}
