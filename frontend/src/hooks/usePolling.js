import { useEffect, useRef, useState, useCallback } from 'react';

const cache = new Map();

export function usePolling(fetcher, intervalMs = 2000, deps = [], cacheKey = null) {
  const cached = cacheKey ? cache.get(cacheKey) : null;
  const [data, setData] = useState(cached || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cached);
  const runningRef = useRef(false);
  const runIdRef = useRef(0);
  const timerRef = useRef(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    let controller = null;

    async function run() {
      if (cancelled || runningRef.current) return;
      runningRef.current = true;
      const runId = ++runIdRef.current;
      controller = new AbortController();
      try {
        const result = await fetcherRef.current(controller.signal);
        if (!cancelled && runId === runIdRef.current) {
          setData(result);
          setError(null);
          if (cacheKey) cache.set(cacheKey, result);
        }
      } catch (err) {
        if (!cancelled && runId === runIdRef.current && err.name !== 'CanceledError') {
          setError(err.message);
        }
      } finally {
        runningRef.current = false;
        if (!cancelled && runId === runIdRef.current) {
          setLoading(false);
        }
      }
    }

    function start() {
      if (document.hidden) return;
      run();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(run, intervalMs);
    }

    function handleVisibility() {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        runningRef.current = false;
        if (controller) controller.abort();
        controller = null;
      } else {
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (controller) controller.abort();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, deps);

  const refetch = useCallback(() => {
    setLoading(true);
    const ctrl = new AbortController();
    fetcherRef.current(ctrl.signal)
      .then((result) => { setData(result); setError(null); if (cacheKey) cache.set(cacheKey, result); })
      .catch((err) => { if (err.name !== 'CanceledError') setError(err.message); })
      .finally(() => setLoading(false));
  }, [cacheKey]);

  return { data, error, loading, refetch };
}
