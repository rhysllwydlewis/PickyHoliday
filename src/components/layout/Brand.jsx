import React from 'react';
import { Star } from 'lucide-react';
import { Logo } from './PickyHolidayLogo.jsx';

export { Logo };

export function Stars({ small = false }) {
  return (
    <div className={small ? 'stars small' : 'stars'}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} fill="currentColor" />
      ))}
    </div>
  );
}
