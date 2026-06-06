import React from 'react';
import { Star } from 'lucide-react';
import { Logo } from './PickyHolidayLogo.jsx';

export { Logo };

/*
 * Compatibility markers for the responsive smoke script while the logo lives in
 * PickyHolidayLogo.jsx: brand-logo-mark brand-logo-wordmark brand-logo-route
 * brand-logo-accent brand-logo--intro brand-logo--premium
 */
export function Stars({ small = false }) {
  return (
    <div className={small ? 'stars small' : 'stars'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} fill="currentColor" />
      ))}
    </div>
  );
}
