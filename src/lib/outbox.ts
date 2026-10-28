import type { AttendanceChange, PastoralOutcomeCategory } from '@/types/database';
import type { DurableStorage } from '@/lib/offlineStorage';
interface OperationBase {
  id: string; userId: string; actorId: string; queuedAt: string;
  error?: string; blocked?: boolean;
}
export type PendingOperation = OperationBase & (
  | { kind: 'attendance'; changes: AttendanceChange[]; auditCategory: string; auditNotes: string }
  | { kind: 'contact'; youthId: string; method: 'call' | 'whatsapp'; outcome: PastoralOutcomeCategory; notes: string; contactedAt: string }
);
export const operationPrefix = (userId: string) => `${userId}/outbox/`;
export const operationKey = (operation: PendingOperation) => `${operationPrefix(operation.userId)}${operation.id}`;
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message :
    typeof error === 'object' && error && 'message' in error ? String(error.message) : 'حدث خطأ غير متوقع';
}
function permanentError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  return ['40001', '42501', '23503', '23505', '23514', '22023', 'P0001', 'PGRST202', 'PGRST204'].includes(code);
}
// Server-side operation IDs make replay safe after a commit followed by a lost acknowledgement.
export async function replayOutbox(userId: string, storage: DurableStorage,
  send: (operation: PendingOperation) => Promise<void>, isCurrentUser: () => boolean = () => true): Promise<void> {
  const operations = (await storage.list<PendingOperation>(operationPrefix(userId)))
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt) || a.id.localeCompare(b.id));
  for (const operation of operations) {
    if (!isCurrentUser() || operation.blocked) break;
    try {
      await send(operation);
      await storage.remove(operationKey(operation));
    } catch (error) {
      await storage.set(operationKey(operation), { ...operation, error: errorMessage(error), blocked: permanentError(error) });
      break;
    }
  }
}
