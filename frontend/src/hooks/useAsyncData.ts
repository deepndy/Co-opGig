import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncDataState<T> {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  reload: () => void;
}

/**
 * Small data-fetching helper for screens. Loader identity is kept in a ref so
 * inline functions do not cause loops; pass explicit dependencies instead.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList = []): AsyncDataState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    loaderRef.current().then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setIsLoading(false);
      },
      (loadError: unknown) => {
        if (cancelled) return;
        setError(loadError);
        setIsLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
    // The dependency list is intentionally supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  return { data, error, isLoading, reload };
}
