import { useState, useCallback } from "react";
import { apiErrorMessage } from "@/api/client";

/**
 * Хук для удобной обработки ошибок API в компонентах.
 * Возвращает error строку, флаг loading и обёртку run() для async-вызовов.
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const run = useCallback(async <T>(
    fn: () => Promise<T>,
    opts?: { successMsg?: string; onSuccess?: (res: T) => void }
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fn();
      if (opts?.successMsg) setSuccess(opts.successMsg);
      opts?.onSuccess?.(res);
      return res;
    } catch (e) {
      setError(apiErrorMessage(e));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return { loading, error, success, run, clear };
}
