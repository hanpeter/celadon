import { useCallback, useRef, useState } from 'react';

export function useLoad<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef(fetcher);
  ref.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await ref.current());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, load };
}
