'use client';
import { useRef, useState } from 'react';
import { errorMessage } from '@/lib/outbox';
export function useMutationFeedback() {
  const [error, setError] = useState(''), [isPending, setPending] = useState(false);
  const running = useRef(false);
  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setPending(true); setError('');
    try { await action(); } catch (error) { setError(errorMessage(error)); }
    finally { running.current = false; setPending(false); }
  }
  return { run, isPending, error, dismiss: () => setError('') };
}
