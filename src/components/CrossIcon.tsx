import React from 'react';

interface CrossIconProps {
  className?: string;
}

/**
 * High-definition vector Latin Cross with rounded caps and balanced proportions.
 * Replaces system emoji ✝️ to eliminate OS-specific purple square artifacts.
 */
export function CrossIcon({ className = 'w-5 h-5 text-current' }: CrossIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.5 2.5a1.25 1.25 0 0 1 2.5 0V7.5h5a1.25 1.25 0 1 1 0 2.5H13v11.5a1.25 1.25 0 1 1-2.5 0V10H5.5a1.25 1.25 0 1 1 0-2.5h5V2.5z" />
    </svg>
  );
}
