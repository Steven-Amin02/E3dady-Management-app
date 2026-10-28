'use client';
import { useState, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/outbox';

export function SignIn() {
  const { signIn, resetPassword, signOut, isSupabase, userId, syncError, retrySync } = useApp(s => ({
    signIn: s.signIn, resetPassword: s.resetPassword, signOut: s.signOut, isSupabase: s.isSupabase, userId: s.userId, syncError: s.syncError, retrySync: s.retrySync,
  }));
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await signIn(email, password); } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  async function recoverPassword() {
    setBusy(true); setError(''); setNotice('');
    try {
      await resetPassword(email);
      setNotice('تم إرسال رابط استعادة كلمة المرور إذا كان البريد مسجلاً لدينا.');
    } catch (error) { setError(errorMessage(error)); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen grid place-items-center p-5 bg-slate-950 text-white" dir="rtl">
    <div className="w-full max-w-sm space-y-5 rounded-3xl border border-slate-700 bg-slate-900 p-6">
      <h1 className="text-xl font-bold">خدمة إعدادي</h1>
      <p className="text-sm text-slate-300">سجّل الدخول بحسابك المعتمد للوصول إلى بيانات الخدمة.</p>
      {!isSupabase ? <p role="alert" className="text-amber-300">اتصال الخدمة غير مُعدّ. يرجى التواصل مع المسؤول.</p> :
        userId ? <div className="space-y-3">
          <p role="alert" className="text-amber-300">{syncError || 'تعذر تحميل ملف الخادم. تحقق من الاتصال وربط الحساب.'}</p>
          <button className="rounded-xl bg-sky-700 px-4 py-2" onClick={() => void retrySync()}>إعادة المحاولة</button>
          <button className="mr-2 underline" onClick={() => void signOut().catch(e => setError(errorMessage(e)))}>تسجيل الخروج</button>
        </div> : <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">البريد الإلكتروني
            <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="mt-1 w-full rounded-xl bg-slate-800 px-3 py-2 border border-slate-600" />
          </label>
          <label className="block text-sm">كلمة المرور
            <div className="mt-1 flex gap-2">
              <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-2 border border-slate-600" />
              <button type="button" className="rounded-xl border border-slate-600 px-3 text-xs" onClick={() => setShowPassword(value => !value)}>{showPassword ? 'إخفاء' : 'إظهار'}</button>
            </div>
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-sky-700 px-4 py-3 font-bold disabled:opacity-50">{busy ? 'جارِ الدخول...' : 'تسجيل الدخول'}</button>
          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
            <button type="button" disabled={busy} className="underline" onClick={() => void recoverPassword()}>نسيت كلمة المرور؟</button>
            <span>ليس لديك حساب؟ اطلب دعوة من مسؤول الخدمة.</span>
          </div>
        </form>}
      {notice && <p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </div>
  </main>;
}
