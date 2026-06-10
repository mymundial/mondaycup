import { useMemo } from "react";

export const DEFAULT_CROWD_COLOURS = [
  "#2DA94F", "#F7D117", "#FF1E3C", "#E1251B", "#2F3ED6", "#8A1538", "#FF8A00", "#1E7FF0",
  "#157A52", "#93BFEA", "#FFFFFF", "#2437C6", "#F20D1B", "#00A86B", "#7CB5E8", "#F7C600",
  "#E10600", "#1A22C9", "#9B003F", "#D50000", "#FF3B30", "#3131E8",
];

const DEFAULT_SKIN_TONES = ["#c98f65", "#8f5f3f", "#e0b184", "#6f4632"];

function CrowdPerson({ x, y, scale = 1, shirt = "#0d6c3d", skin = "#c98f65", pose = "down", opacity = 1 }) {
  const armLeft = pose === "up" ? "M5 13 L1 6" : "M5 13 L2 20";
  const armRight = pose === "up" ? "M13 13 L17 6" : "M13 13 L16 20";
  return (
    <svg
      className="absolute overflow-visible"
      style={{ left: `${x}%`, top: `${y}%`, width: `${18 * scale}px`, height: `${30 * scale}px`, opacity, transform: "translate(-50%, -50%)" }}
      viewBox="0 0 18 30"
      aria-hidden="true"
    >
      <path d={armLeft} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <path d={armRight} fill="none" stroke={shirt} strokeWidth="3" strokeLinecap="round" />
      <circle cx="9" cy="6" r="4" fill={skin} />
      <rect x="4" y="11" width="10" height="12" rx="3" fill={shirt} />
      <rect x="5" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
      <rect x="10" y="22" width="3" height="8" rx="1.5" fill="#0b2d1d" />
    </svg>
  );
}

function buildCrowdRows({ crowdColours = DEFAULT_CROWD_COLOURS, density = 1, rowCount = 16 }) {
  const safeDensity = Math.max(0.35, Math.min(1, Number(density || 1)));
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const t = rowCount <= 1 ? 1 : index / (rowCount - 1);
    const y = 2.5 + 94 * Math.pow(t, 1.24);
    const baseCount = 62 - t * 34;
    const count = Math.max(10, Math.round(baseCount * safeDensity));
    const step = (1.68 + t * 2.45) / safeDensity;
    const stagger = 0.18 + t * 1.04;
    const centredStartX = 50 - (((count - 1) * step) + stagger) / 2;
    return Array.from({ length: count }, (_, i) => ({
      x: centredStartX + i * step + (i % 2 ? stagger : 0),
      y: y + (i % 3) * (0.12 + t * 0.8),
      scale: 0.26 + t * 0.78,
      shirt: crowdColours[((i * 7) + index) % crowdColours.length],
      skin: DEFAULT_SKIN_TONES[(i + index) % DEFAULT_SKIN_TONES.length],
      pose: i % 4 === 0 || i % 7 === 0 ? "up" : "down",
      opacity: 0.16 + t * 0.84,
    }));
  });
  return rows.flat();
}

export default function SharedCrowdBackdrop({
  crowdColours = DEFAULT_CROWD_COLOURS,
  density = 1,
  rowCount = 16,
  className = "pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden",
  style,
}) {
  const colourKey = (crowdColours?.length ? crowdColours : DEFAULT_CROWD_COLOURS).join("|");
  const crowdRows = useMemo(() => buildCrowdRows({ crowdColours: crowdColours?.length ? crowdColours : DEFAULT_CROWD_COLOURS, density, rowCount }), [colourKey, density, rowCount]);

  return (
    <div className={className} style={style} aria-hidden="true">
      <div className="absolute inset-0 bg-[#123822]" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,26,17,0.52), rgba(5,26,17,0.28) 30%, rgba(5,26,17,0.18) 58%, rgba(5,26,17,0.10) 100%), radial-gradient(circle at 18% 10%, rgba(245,241,232,0.05), transparent 18%), radial-gradient(circle at 82% 14%, rgba(255,214,0,0.04), transparent 16%)",
        }}
      />
      <div className="absolute inset-x-0 top-[6%] h-[6%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[16%] h-[7%] bg-[#0b2d1d]/8" />
      <div className="absolute inset-x-0 top-[28%] h-[8%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[41%] h-[9%] bg-[#0b2d1d]/8" />
      <div className="absolute inset-x-0 top-[55%] h-[10%] bg-[#0b2d1d]/10" />
      <div className="absolute inset-x-0 top-[70%] h-[11%] bg-[#0b2d1d]/8" />
      <div className="absolute inset-x-0 top-[85%] h-[10%] bg-[#0b2d1d]/10" />
      {crowdRows.map((person, index) => <CrowdPerson key={index} {...person} />)}
    </div>
  );
}
