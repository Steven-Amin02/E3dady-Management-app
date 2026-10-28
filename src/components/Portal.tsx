'use client';
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const dialogs: HTMLElement[] = [];
let originalOverflow = '';
interface PortalProps { children: ReactNode; lockScroll?: boolean }
export function Portal({ children, lockScroll = true }: PortalProps) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!mounted || !lockScroll || !element) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialogs.length) { originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogs.push(element);
    const heading = element.querySelector('h1,h2,h3,h4');
    if (heading) { heading.id ||= 'dialog-' + crypto.randomUUID(); element.setAttribute('aria-labelledby', heading.id); }
    const selector = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
    const focusable = () => Array.from(element.querySelectorAll<HTMLElement>(selector)).filter(el => el.getClientRects().length > 0);
    (focusable()[0] ?? element).focus();
    const keydown = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== element) return;
      if (event.key === 'Escape') {
        const close = element.querySelector<HTMLElement>('[data-dialog-close]');
        if (close) { event.preventDefault(); close.click(); }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); element.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      dialogs.splice(dialogs.indexOf(element), 1);
      if (!dialogs.length) document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', keydown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [mounted, lockScroll]);
  if (!mounted) return null;
  return createPortal(<div ref={container} role={lockScroll ? 'dialog' : undefined} aria-modal={lockScroll || undefined} tabIndex={-1}>{children}</div>, document.body);
}
