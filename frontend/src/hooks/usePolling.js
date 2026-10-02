/**
 * hooks/usePolling.js — Hook lấy dữ liệu định kỳ + cache + huỷ request
 *
 * Tính năng:
 * - Poll lại fetcher mỗi intervalMs bằng AbortController (huỷ request cũ khi thay đổi).
 * - intervalMs <= 0: chỉ fetch 1 lần lúc mount + khi deps đổi + khi refetch(), KHÔNG tự poll.
 * - Cache toàn cục theo cacheKey (Map ở module) → trở lại trang hiển thị dữ liệu ngay,
 *   không flash loading. cacheKey có thể là chuỗi fingerprint (page/filter/sort).
 * - Tạm dừng poll khi tab ẩn (document.hidden), tự chạy lại khi tab hiện.
 * - refetch(): abort request đang chạy dở, tải lại ngay (nút Reload) và cập nhật cache.
 * - Không setState sau khi component unmount (mountedRef).
 *
 * Tham số: fetcher(signal), intervalMs, deps (khi đổi → chạy lại effect — cần đưa intervalMs
 * vào deps nếu nó thay đổi theo điều kiện), cacheKey (chuỗi, thường là fingerprint).
 * Trả về: { data, error, loading, refetch }.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const cache = new Map();

export function usePolling(fetcher, intervalMs = 2000, deps = [], cacheKey = null) {
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const cached = cacheKey ? cache.get(cacheKey) : null;

  const [data, setData] = useState(cached || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cached);
  
  const runningRef = useRef(false);
  const timerRef = useRef(null);
  const controllerRef = useRef(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await fetcherRef.current(controller.signal);
      if (mountedRef.current && controllerRef.current === controller) {
        setData(result);
        setError(null);
        if (cacheKeyRef.current) cache.set(cacheKeyRef.current, result);
      }
    } catch (err) {
      if (mountedRef.current && controllerRef.current === controller && err.name !== 'CanceledError') {
        setError(err.message);
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        runningRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function start() {
      if (document.hidden) return;
      void run();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = intervalMs > 0 ? setInterval(run, intervalMs) : null;
    }

    function handleVisibility() {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        runningRef.current = false;
        if (controllerRef.current) controllerRef.current.abort();
        controllerRef.current = null;
      } else {
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      runningRef.current = false;
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = null;
    runningRef.current = false;
    setLoading(true);
    void run();
  }, [run]);

  return { data, error, loading, refetch };
}