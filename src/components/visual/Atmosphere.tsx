import type { Atmosphere as AtmosphereKind } from "@/lib/data/types";

/**
 * Low-contrast background that reflects an artist's discipline.
 * Always behind content, never interactive, motion only for music and only
 * when the user has not asked for reduced motion (handled in globals.css).
 */
export function Atmosphere({ kind }: { kind: AtmosphereKind }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {kind === "music" && <MusicNotes />}
      {kind === "paint" && <Svg pattern={<path d="M0 60 C40 20 80 100 120 50" stroke="#F28C28" strokeWidth="18" fill="none" strokeLinecap="round" opacity=".07" />} size={160} />}
      {kind === "clay" && (
        <svg className="absolute -end-24 -top-16 h-[520px] w-[520px] opacity-[0.09]" viewBox="0 0 200 200">
          <path fill="#B45F0E" d="M45 160 C20 120 30 70 70 55 C60 30 85 15 105 20 C140 28 150 60 140 80 C175 95 180 140 150 165 C120 190 70 190 45 160 Z" />
        </svg>
      )}
      {kind === "textile" && (
        <Svg
          size={56}
          pattern={
            <g fill="none" stroke="#B45F0E" strokeWidth="1" opacity=".16">
              <path d="M28 4 L52 28 L28 52 L4 28 Z" />
              <path d="M28 16 L40 28 L28 40 L16 28 Z" />
            </g>
          }
        />
      )}
      {kind === "photo" && (
        <svg className="absolute inset-6 h-[calc(100%-3rem)] w-[calc(100%-3rem)] opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0 6 V0 H6 M94 0 H100 V6 M100 94 V100 H94 M6 100 H0 V94" stroke="#171717" strokeWidth=".3" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {kind === "design" && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "linear-gradient(rgba(23,23,23,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(23,23,23,.05) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      )}
      {kind === "material" && (
        <Svg
          size={200}
          pattern={
            <g fill="none" stroke="#B45F0E" strokeWidth=".8" opacity=".12">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <path key={i} d={`M0 ${12 + i * 25} C60 ${4 + i * 25} 120 ${24 + i * 25} 200 ${10 + i * 25}`} />
              ))}
            </g>
          }
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-cream" />
    </div>
  );
}

function Svg({ pattern, size }: { pattern: React.ReactNode; size: number }) {
  const id = `p${size}`;
  return (
    <svg className="absolute inset-0 h-full w-full">
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          {pattern}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

const NOTES = [
  { left: "8%", top: "22%", delay: "0s", size: 22 },
  { left: "22%", top: "64%", delay: "-3s", size: 16 },
  { left: "71%", top: "18%", delay: "-6s", size: 26 },
  { left: "86%", top: "56%", delay: "-1.5s", size: 18 },
  { left: "54%", top: "78%", delay: "-4.5s", size: 14 },
];

function MusicNotes() {
  return (
    <>
      <svg className="absolute inset-x-0 top-1/3 h-24 w-full opacity-[0.12]" preserveAspectRatio="none" viewBox="0 0 400 40">
        <path d="M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20" stroke="#F28C28" fill="none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M0 26 Q25 14 50 26 T100 26 T150 26 T200 26 T250 26 T300 26 T350 26 T400 26" stroke="#F28C28" fill="none" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
      </svg>
      {NOTES.map((n, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute animate-[drift_12s_ease-in-out_infinite] opacity-[0.14]"
          style={{ left: n.left, top: n.top, width: n.size, height: n.size, animationDelay: n.delay }}
        >
          <path d="M9 18 a3 3 0 1 1 -2 -2.8 V5 l10 -2 v11 a3 3 0 1 1 -2 -2.8 V6.5 L9 7.7 Z" fill="#B45F0E" />
        </svg>
      ))}
    </>
  );
}
