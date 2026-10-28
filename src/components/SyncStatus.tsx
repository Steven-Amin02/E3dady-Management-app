'use client';
import { useApp } from '@/context/AppContext';
export function SyncStatus() {
  const { status, pendingOperations, syncError, error, dismissError, retrySync, discardOperation, isAdmin, hasLegacyBackup, downloadLegacyBackup } = useApp(s => ({
    status: s.status, pendingOperations: s.pendingOperations, syncError: s.syncError, error: s.error,
    dismissError: s.dismissError, retrySync: s.retrySync, discardOperation: s.discardOperation,
    isAdmin: s.isAdmin, hasLegacyBackup: s.hasLegacyBackup, downloadLegacyBackup: s.downloadLegacyBackup,
  }));
  if (status === 'online' && !pendingOperations.length && !syncError && !error && !(isAdmin && hasLegacyBackup)) return null;
  return <aside className="my-3 space-y-2 rounded-2xl border border-amber-400 bg-amber-50 p-3 text-sm text-slate-900" aria-live="polite">
    <p>{status === 'offline' ? 'بدون اتصال — المعروض نسخة محفوظة على هذا الجهاز.' : 'حالة المزامنة'}</p>
    {!!pendingOperations.length && <p>{pendingOperations.length} محاولة محفوظة على الجهاز تنتظر تأكيد الخادم.</p>}
    {syncError && <p role="alert">{syncError}</p>}
    {error && <p role="alert">{error} <button className="underline" onClick={dismissError}>إغلاق</button></p>}
    <button className="rounded-lg bg-sky-800 px-3 py-1 text-white" onClick={() => void retrySync()}>إعادة المزامنة</button>
    {isAdmin && hasLegacyBackup && <p className="text-xs">احتُفظ بنسخة من البيانات المحلية القديمة للمراجعة؛ لم تُرفع تلقائياً.
      <button className="mr-2 underline" onClick={() => void downloadLegacyBackup()}>تنزيل النسخة القديمة</button></p>}
    {pendingOperations.filter(op => op.blocked).map(op => <div key={op.id} className="border-t border-amber-300 pt-2">
      <p>{op.error}</p>
      <button className="underline" onClick={() => {
        if (window.confirm('إلغاء هذه المحاولة غير المحفوظة على الخادم؟ ستحتاج إلى إدخال التغيير مجدداً بعد تحميل أحدث البيانات.')) void discardOperation(op.id);
      }}>إلغاء المحاولة وإعادة تحميل بيانات الخادم</button>
    </div>)}
  </aside>;
}
