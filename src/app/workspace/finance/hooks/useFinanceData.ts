'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function revalidateFinanceAndExpensesCache() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('finance_expenses_updated'));
    window.dispatchEvent(new CustomEvent('team_finance_updated'));
    try {
      if (typeof (window as any).mutate === 'function') {
        (window as any).mutate((key: any) => typeof key === 'string' && (key.includes('expenses') || key.includes('analytics') || key.includes('team') || key.includes('finance')), undefined, { revalidate: true });
      }
    } catch (_) {}
  }
}

export function useFinanceData() {
  const router = useRouter();

  const revalidate = useCallback(() => {
    revalidateFinanceAndExpensesCache();
    router.refresh();
  }, [router]);

  return {
    revalidate,
    revalidateFinanceAndExpensesCache
  };
}

export default useFinanceData;
