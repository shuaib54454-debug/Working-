import React from "react";

interface ShuaybLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "full" | "icon" | "horizontal";
  showSubtitle?: boolean;
}

export const ShuaybLogo: React.FC<ShuaybLogoProps> = ({
  className = "",
  size = "md",
  variant = "horizontal",
  showSubtitle = true
}) => {
  // Dimensions based on size
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
    full: "w-36 h-36"
  };

  const IconSVG = (
    <svg
      viewBox="0 0 400 400"
      className={`${iconSizes[size]} shrink-0 drop-shadow-sm select-none`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Soft Circle Frame */}
      <circle cx="200" cy="200" r="190" fill="#FBF8F3" stroke="#C9A84C" strokeWidth="3" />

      {/* Decorative Crescent Arch */}
      <path
        d="M 90 280 C 60 180, 110 70, 240 60 C 200 85, 140 140, 130 260 Z"
        fill="#8B262A"
        opacity="0.85"
      />

      {/* Global Network Arc & Globe */}
      <circle cx="280" cy="220" r="55" fill="#172A46" />
      {/* Globe Lat/Long lines & continents hint */}
      <circle cx="280" cy="220" r="52" stroke="#FFFFFF" strokeWidth="2" fill="#223D64" />
      <ellipse cx="280" cy="220" rx="30" ry="52" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" fill="none" />
      <line x1="228" y1="220" x2="332" y2="220" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />
      <path d="M 260 200 Q 280 190 300 205 Q 310 230 290 240 Q 265 245 260 220 Z" fill="#75A064" opacity="0.8" />

      {/* Airplane & Flight Trail */}
      <path
        d="M 230 240 C 235 180, 250 140, 290 120"
        stroke="#C9A84C"
        strokeWidth="3"
        strokeDasharray="4 3"
        fill="none"
      />
      <path
        d="M 285 118 L 305 110 L 298 126 L 302 135 L 290 128 L 278 132 L 285 118 Z"
        fill="#172A46"
      />

      {/* Cargo Cargo Ship / Logistics */}
      <path
        d="M 220 270 L 230 255 L 290 255 L 300 270 L 320 270 L 305 288 L 225 288 Z"
        fill="#172A46"
      />
      <rect x="250" y="243" width="22" height="12" fill="#8B262A" rx="1" />
      <rect x="256" y="235" width="10" height="8" fill="#C9A84C" rx="1" />
      {/* Sea waves */}
      <path
        d="M 215 292 Q 240 286 265 292 T 315 292 T 340 292"
        stroke="#172A46"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Agricultural Olive/Coffee Harvest Branch */}
      <g transform="translate(65, 120)">
        {/* Main Stem */}
        <path d="M 50 140 Q 40 70 30 10" stroke="#486D32" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Leaves */}
        <path d="M 30 10 Q 5 5 15 25 Q 30 20 30 10 Z" fill="#486D32" />
        <path d="M 35 40 Q 65 30 55 55 Q 35 50 35 40 Z" fill="#58853D" />
        <path d="M 32 70 Q 5 60 18 85 Q 35 80 32 70 Z" fill="#486D32" />
        <path d="M 38 100 Q 70 95 60 118 Q 40 110 38 100 Z" fill="#58853D" />
        {/* Coffee / Agricultural Cherries */}
        <circle cx="42" cy="55" r="7" fill="#8B262A" />
        <circle cx="48" cy="63" r="6" fill="#B33939" />
        <circle cx="36" cy="65" r="5" fill="#8B262A" />
        <circle cx="30" cy="95" r="6.5" fill="#8B262A" />
        <circle cx="38" cy="102" r="6" fill="#B33939" />
      </g>

      {/* Cotton & Wheat Bundle */}
      <g transform="translate(110, 220)">
        {/* Wheat Stalks */}
        <path d="M 20 40 L 45 10" stroke="#C9A84C" strokeWidth="3" />
        <circle cx="45" cy="10" r="4" fill="#C9A84C" />
        <circle cx="38" cy="18" r="3.5" fill="#C9A84C" />
        {/* Cotton bulb */}
        <circle cx="20" cy="35" r="8" fill="#FFFFFF" stroke="#8A733E" strokeWidth="1" />
        <circle cx="14" cy="38" r="6" fill="#FFFFFF" stroke="#8A733E" strokeWidth="1" />
        <circle cx="26" cy="38" r="6" fill="#FFFFFF" stroke="#8A733E" strokeWidth="1" />
      </g>

      {/* Center Calligraphy Artwork "شُعيب" */}
      <g transform="translate(130, 45)">
        {/* Calligraphic Shuayb letters in luxury Burgundy/Wine */}
        <path
          d="M 50 170 C 80 180, 110 140, 95 100 C 85 70, 40 50, 45 10 C 65 30, 110 80, 105 130 C 100 170, 60 195, 20 180 Z"
          fill="#8B262A"
        />
        <path
          d="M 40 135 C 70 130, 80 100, 60 90 C 35 80, 20 110, 40 135 Z"
          fill="#8B262A"
        />
        {/* Tashkeel & Diacritics (Damma, Dots) */}
        <circle cx="58" cy="30" r="5" fill="#172A46" />
        <circle cx="58" cy="18" r="5" fill="#172A46" />
        <circle cx="58" cy="6" r="5" fill="#172A46" />
        <circle cx="70" cy="155" r="5.5" fill="#172A46" />
        <circle cx="85" cy="155" r="5.5" fill="#172A46" />
      </g>

      {/* Decorative Golden Base Arch / Bridge */}
      <path
        d="M 80 340 L 320 340 M 120 340 Q 200 310 280 340"
        stroke="#C9A84C"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="200" cy="325" r="4" fill="#C9A84C" />
    </svg>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center justify-center ${className}`}>{IconSVG}</div>;
  }

  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center p-4 ${className}`}>
        {IconSVG}
        
        {/* Main Latin & Arabic Title */}
        <div className="mt-3">
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-[#172a46]">
            Shuayb
          </h2>
          <p className="text-xs sm:text-sm font-extrabold tracking-[0.25em] text-[#8B262A] uppercase">
            TRADE BRIDGE
          </p>
        </div>

        {/* Bridge Vector Line */}
        <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent my-2" />

        {/* Arabic Subtitle */}
        {showSubtitle && (
          <>
            <p className="text-xs sm:text-sm font-extrabold text-[#172a46] max-w-xs leading-snug">
              مكتب تسهيل خدمات وتسويق المنتجات الزراعية وغيرها الإثيوبية
            </p>

            {/* 3 Pillars */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-stone-200 text-center w-full max-w-sm">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#3B6B38] text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs">
                  ✓
                </div>
                <span className="text-[10px] font-extrabold text-stone-800">تسهيل الخدمات</span>
                <span className="text-[8px] text-stone-500 uppercase">Service Facilitation</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#486D32] text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs">
                  🌱
                </div>
                <span className="text-[10px] font-extrabold text-stone-800">تسوق المنتجات</span>
                <span className="text-[8px] text-stone-500 uppercase">Product Marketing</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-[#8A6A32] text-white flex items-center justify-center text-xs font-bold mb-1 shadow-xs">
                  🌐
                </div>
                <span className="text-[10px] font-extrabold text-stone-800">منتجات إثيوبية</span>
                <span className="text-[8px] text-stone-500 uppercase">Ethiopian Products</span>
              </div>
            </div>

            {/* Slogan */}
            <div className="mt-3 text-center">
              <p className="text-[11px] font-black text-[#8B262A]">
                نربط الفرص ... نصنع المستقبل
              </p>
              <p className="text-[9px] font-semibold text-stone-500 tracking-wider uppercase">
                CONNECTING OPPORTUNITIES ... BUILDING THE FUTURE
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  // Horizontal variant for TopBar, Headers, and Card headers
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {IconSVG}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-serif font-black text-base sm:text-lg tracking-tight text-inherit">
            Shuayb
          </span>
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#c9a84c] uppercase">
            TRADE BRIDGE
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[10px] sm:text-[11px] opacity-85 truncate max-w-[200px] sm:max-w-md">
            مكتب تسهيل خدمات وتسويق المنتجات الزراعية وغيرها الإثيوبية
          </p>
        )}
      </div>
    </div>
  );
};
