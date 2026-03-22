import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber — count-up animation from 0 to target value.
 * Supports formatted strings like "$1.2M", "45.3%", "1,234", etc.
 */
export default function AnimatedNumber({ value, duration = 1200, className = '' }) {
  const [display, setDisplay] = useState('0');
  const frameRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!value && value !== 0) {
      setDisplay(value || '—');
      return;
    }

    const str = String(value);

    // Extract numeric part, prefix, and suffix
    const match = str.match(/^([^0-9\-.]*)(-?[\d,]+\.?\d*)(.*)$/);
    if (!match) {
      setDisplay(str);
      return;
    }

    const prefix = match[1]; // e.g., "$"
    const numStr = match[2].replace(/,/g, ''); // e.g., "1234.56"
    const suffix = match[3]; // e.g., "%", "M", "K"
    const target = parseFloat(numStr);

    if (isNaN(target)) {
      setDisplay(str);
      return;
    }

    // Determine decimal places
    const decimalPlaces = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    const hasCommas = match[2].includes(',');

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;

      let formatted;
      if (decimalPlaces > 0) {
        formatted = current.toFixed(decimalPlaces);
      } else {
        formatted = Math.round(current).toString();
      }

      // Add commas back
      if (hasCommas) {
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        formatted = parts.join('.');
      }

      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
