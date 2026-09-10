import React from 'react';

interface BomberLogoProps {
  variant?: 'full' | 'icon' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
}

export const BomberLogo: React.FC<BomberLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showSubtitle = true,
}) => {
  // Brand gradient stops: Electric Lime / Neon Green (#D4FF00) -> Vivid Green (#16A34A)
  const gradId = 'bomber-brand-gradient';

  if (variant === 'icon') {
    const dim = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${dim} ${className}`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4FF00" />
              <stop offset="50%" stopColor="#84CC16" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
          </defs>
          {/* Outer athletic hexagon badge */}
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            rx="12"
            fill="#18181B"
            stroke="url(#bomber-brand-gradient)"
            strokeWidth="2"
          />
          {/* Dynamic stylized athletic B / bomb-dumbbell emblem */}
          <path
            d="M17 12H28C32.4183 12 36 15.134 36 19C36 21.6 34.5 23.8 32.2 24.8C35.1 26 37 28.6 37 31.7C37 36 33.2 39 28.5 39H17C15.8954 39 15 38.1046 15 37V14C15 12.8954 15.8954 12 17 12Z"
            fill="url(#bomber-brand-gradient)"
          />
          {/* Inner negative cutouts for sharp energetic B */}
          <path
            d="M21 17H27C28.6569 17 30 18.1193 30 19.5C30 20.8807 28.6569 22 27 22H21V17Z"
            fill="#18181B"
          />
          <path
            d="M21 27H28C29.6569 27 31 28.3431 31 30C31 31.6569 29.6569 33 28 33H21V27Z"
            fill="#18181B"
          />
          {/* Athletic lightning notch */}
          <path
            d="M32 9L29 15H35L30 23"
            stroke="#D4FF00"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  // Full / Horizontal
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Emblem */}
      <div
        className={`relative shrink-0 flex items-center justify-center rounded-xl bg-[#18181B] border border-white/10 shadow-md ${
          isSm ? 'w-8 h-8' : isLg ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10'
        }`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          <defs>
            <linearGradient id={`${gradId}-full`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4FF00" />
              <stop offset="50%" stopColor="#84CC16" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
          </defs>
          <path
            d="M17 12H28C32.4183 12 36 15.134 36 19C36 21.6 34.5 23.8 32.2 24.8C35.1 26 37 28.6 37 31.7C37 36 33.2 39 28.5 39H17C15.8954 39 15 38.1046 15 37V14C15 12.8954 15.8954 12 17 12Z"
            fill={`url(#${gradId}-full)`}
          />
          <path
            d="M21 17H27C28.6569 17 30 18.1193 30 19.5C30 20.8807 28.6569 22 27 22H21V17Z"
            fill="#18181B"
          />
          <path
            d="M21 27H28C29.6569 27 31 28.3431 31 30C31 31.6569 29.6569 33 28 33H21V27Z"
            fill="#18181B"
          />
          {/* Energy spark */}
          <path
            d="M33 8L30 14H36L31 21"
            stroke="#D4FF00"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Name */}
      <div className="leading-none">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#D4FF00] via-[#A3E635] to-[#16A34A] ${
              isSm ? 'text-base' : isLg ? 'text-2xl' : 'text-lg'
            }`}
            style={{ fontStyle: 'italic', letterSpacing: '-0.03em' }}
          >
            BOMBER
          </span>
          <span
            className={`font-extrabold tracking-widest text-white ${
              isSm ? 'text-xs' : isLg ? 'text-base' : 'text-sm'
            }`}
          >
            FITNESS
          </span>
        </div>
        {showSubtitle && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1 w-1 rounded-full bg-[#D4FF00]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Financeiro
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
