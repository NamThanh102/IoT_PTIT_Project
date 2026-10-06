// Custom Hook: Lấy dữ liệu định kỳ (Polling) + Cache dữ liệu + Hủy request cũ tránh xung đột
import { useEffect, useRef, useState, useCallback } from 'react';

// Cache toàn cục (giúp mượt mà, k bị loading)
const cache = new Map();

export function usePolling(fetcher, intervalMs = 2000, deps = [], cacheKey = null) {
  // Khởi tạo dữ liệu từ cache nếu có 
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;
  const cached = cacheKey ? cache.get(cacheKey) : null;

  // các State qly dữ liệu
  const [data, setData] = useState(cached || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!cached);
  
  // Các Ref qly tiến trình ngầm 
  const runningRef = useRef(false);         // Cờ đánh dấu có request nào đang chạy dở hay không
  const timerRef = useRef(null);            // Lưu id của bộ đếm setInterval
  const controllerRef = useRef(null);       // Bộ điều khiển AbortController để hủy HTTP request
  const mountedRef = useRef(true);          // Đánh dấu component còn hiển thị hay đã bị đóng (unmounted)
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  //  Hàm thực thi gọi API 
  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    // Hủy request trước đó nếu nó chưa kịp phản hồi
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const result = await fetcherRef.current(controller.signal);
      // cập nhật dữ liệu nếu component vẫn còn đang hiển thị trên màn hình
      if (mountedRef.current && controllerRef.current === controller) {
        setData(result);
        setError(null);
        if (cacheKeyRef.current) cache.set(cacheKeyRef.current, result);
      }
    } catch (err) {
      // Bỏ qua lỗi nếu request bị chủ động hủy (CanceledError)
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

  // Vòng đời Polling: useEffect lặp lại và tạm dừng khi ẩn tab trình duyệt
  useEffect(() => {
    mountedRef.current = true;

    // Bắt đầu chu kỳ lấy dữ liệu định kỳ
    function start() {
      if (document.hidden) return; // Nếu đang ẩn tab thì không chạy
      void run();
      if (timerRef.current) clearInterval(timerRef.current);
      // Nếu intervalMs > 0 thì tự động lặp lại; nếu <= 0 thì chỉ gọi đúng 1 lần
      timerRef.current = intervalMs > 0 ? setInterval(run, intervalMs) : null;
    }

    // Xử lý tiết kiệm tài nguyên khi người dùng chuyển sang tab khác trên trình duyệt
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

    // Dọn dẹp bộ nhớ (Cleanup) khi component bị unmount hoặc deps thay đổi
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      runningRef.current = false;
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, deps);

  // Hàm ép tải lại dữ liệu ngay lập tức (dùng cho nút Reload)
  const refetch = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = null;
    runningRef.current = false;
    setLoading(true);
    void run();
  }, [run]);

  return { data, error, loading, refetch };
}