"use client";

// Cinematic "Sweep → Shutter Reveal" success animation.
// Drop inside any `relative rounded-full` container — fills 100%.
export function SuccessAnimation() {
  return (
    <>
      <style>{`
        @keyframes sa-sweep {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sa-top-open {
          to { transform: scaleY(0); }
        }
        @keyframes sa-bot-open {
          to { transform: scaleY(0); }
        }
        @keyframes sa-check-pop {
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes sa-check-draw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sa-glow-settle {
          0%   { opacity: 0; }
          35%  { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .sa-ring {
          stroke-dasharray: 283;
          stroke-dashoffset: 283;
          animation: sa-sweep 1.2s 0s cubic-bezier(0.4, 0, 0.15, 1) forwards;
        }
        .sa-shutter-top {
          transform-origin: bottom center;
          animation: sa-top-open 0.48s 1.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .sa-shutter-bot {
          transform-origin: top center;
          animation: sa-bot-open 0.48s 1.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .sa-check-wrap {
          transform: scale(0);
          opacity: 0;
          animation: sa-check-pop 0.55s 1.68s cubic-bezier(0.34, 1.5, 0.64, 1) forwards;
        }
        .sa-check {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: sa-check-draw 0.46s 1.92s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .sa-glow {
          opacity: 0;
          animation: sa-glow-settle 1.1s 2.0s ease-out forwards;
        }
      `}</style>

      {/* Animated arc ring — outside the overflow-hidden inner wrapper so stroke isn't clipped */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        style={{ transform: "rotate(-90deg)", zIndex: 2 }}
      >
        <defs>
          <linearGradient id="sa-teal-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7ad5dd" />
            <stop offset="100%" stopColor="#4db8c2" />
          </linearGradient>
        </defs>
        {/* Sweeping arc — r=45, circumference ≈ 283 */}
        <circle
          className="sa-ring"
          fill="none"
          stroke="url(#sa-teal-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          cx="50" cy="50" r="45"
        />
      </svg>

      {/* Inner circle: dark fill + shutters + settled glow — clipped to circle shape */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: "5%",
          zIndex: 1,
          background: "radial-gradient(circle at 45% 38%, #1a2829, #0f1a1b)",
        }}
      >
        {/* Shutter — top half slides up (1px extra overlap to kill seam) */}
        <div
          className="sa-shutter-top absolute inset-x-0 top-0"
          style={{ height: "calc(50% + 1px)", background: "#151515" }}
        />
        {/* Shutter — bottom half slides down (1px extra overlap to kill seam) */}
        <div
          className="sa-shutter-bot absolute inset-x-0 bottom-0"
          style={{ height: "calc(50% + 1px)", background: "#151515" }}
        />
        {/* Teal glow that settles after shutters open */}
        <div
          className="sa-glow absolute inset-0"
          style={{
            background:
              "radial-gradient(circle, rgba(122,213,221,0.22) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* Checkmark — drawn on top after shutter opens */}
      <div
        className="sa-check-wrap absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 3 }}
      >
        <svg
          aria-hidden="true"
          width="100"
          height="100"
          viewBox="0 0 48 48"
          style={{ marginTop: "2px" }}
        >
          <path
            className="sa-check"
            fill="none"
            stroke="#7ad5dd"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 24 L20 34 L37 14"
          />
        </svg>
      </div>
    </>
  );
}
