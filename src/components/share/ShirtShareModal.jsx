import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, getTeamTheme } from "../../data/teams.js";
import { ASSETS } from "../../data/assets.js";
import {
  captureShareElementBlob,
  shareNativeImage,
  shareOrDownloadResult,
} from "../../utils/shareExport.js";
import { ShirtPosterPreview } from "./SharePreviews.jsx";

const TEAM_OPTIONS = Object.values(GROUPS).flat().sort((a, b) => a.localeCompare(b));
const IVORY = "#FFFFFF";
const SHIRT_BG = "#073B26";
const LED_YELLOW = "#F7D117";
const PITCH_MOW_BACKGROUND_STYLE = {
  backgroundColor: "#0d6c3d",
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))",
  backgroundSize: "100% 100%",
};
const SHIRT_LAYOUT_VERSION = 6;
const DEFAULT_COMPOSITION = {
  mondayScale: 1.18,
  mondayX: 0,
  mondayY: 0,
  nameScale: 1.18,
  nameX: 0,
  nameY: 0,
  numberScale: 1.58,
  numberX: 0,
  numberY: 0,
  brothersScale: 0.65,
  brothersX: 0,
  brothersY: 0,
};

export function cleanName(value, fallback = "MONDAY") {
  const clean = String(value || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim()
    .toUpperCase()
    .slice(0, 14);
  return clean || fallback;
}

export function cleanNumber(value, fallback = "11") {
  const clean = String(value ?? "").replace(/[^0-9]/g, "").slice(0, 2);
  return clean || fallback;
}

export function usernameFromUser(currentUser) {
  return cleanName(currentUser?.displayName || currentUser?.email?.split("@")[0] || "MONDAY");
}


function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawImageContain(ctx, image, centerX, centerY, boxW, boxH) {
  if (!image?.naturalWidth || !image?.naturalHeight) return;
  const scale = Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
}

function canvasShirtFabricTheme(team, fallbackBackground, fallbackText, fallbackNumber, patternOptions = {}) {
  const base = team ? getTeamTheme(team) : null;
  const result = {
    background: base?.primary || base?.bg || fallbackBackground || SHIRT_BG,
    textColour: base?.secondary || base?.text || fallbackText || IVORY,
    numberColour: base?.secondary || base?.text || fallbackNumber || fallbackText || IVORY,
    numberOutlineEnabled: false,
    numberOutlineColour: "transparent",
    numberOutlineWidth: 0,
    pattern: null,
    patternColour: patternOptions.patternColour || "#FFFFFF",
    brothersAsset: ASSETS.branding.myMundialLogo,
  };

  switch (team) {
    case "Argentina":
      result.background = base?.primary || "#75AADB";
      result.textColour = base?.tertiary || "#1F2A44";
      result.numberColour = base?.tertiary || "#1F2A44";
      result.pattern = "argentina-stripes";
      break;
    case "Brazil":
      result.background = base?.primary || "#F7D117";
      result.textColour = base?.secondary || "#009C3B";
      result.numberColour = base?.secondary || "#009C3B";
      break;
    case "Croatia":
      result.background = base?.primary || "#FFFFFF";
      result.textColour = base?.tertiary || "#23408E";
      result.numberColour = base?.tertiary || "#23408E";
      result.pattern = "croatia-checker";
      break;
    case "United States":
      result.background = base?.primary || "#FFFFFF";
      result.textColour = base?.secondary || "#1F2A44";
      result.numberColour = base?.secondary || "#1F2A44";
      break;
    case "England":
      result.background = base?.primary || "#FFFFFF";
      result.textColour = base?.secondary || "#C8102E";
      result.numberColour = base?.secondary || "#C8102E";
      result.numberOutlineEnabled = true;
      result.numberOutlineColour = base?.tertiary || "#1F2A44";
      result.numberOutlineWidth = 9;
      break;
    case "Portugal":
      result.background = base?.primary || "#B30B18";
      result.textColour = base?.tertiary || "#FFFFFF";
      result.numberColour = base?.tertiary || "#FFFFFF";
      result.numberOutlineEnabled = true;
      result.numberOutlineColour = base?.secondary || "#006A4E";
      result.numberOutlineWidth = 11;
      break;
    default:
      break;
  }

  // Keep canvas export in sync with the live editor preview.
  result.background = fallbackBackground || result.background;
  result.textColour = fallbackText || result.textColour;
  result.numberColour = fallbackNumber || fallbackText || result.numberColour;
  const manualPattern = patternOptions.patternMode || "team";
  if (manualPattern === "plain") {
    result.pattern = null;
  } else if (manualPattern && manualPattern !== "team") {
    result.pattern = manualPattern;
  }
  result.patternColour = patternOptions.patternColour || result.patternColour || "#FFFFFF";

  const whiteBackground = ["#FFFFFF", "#F5F1E8"].includes(String(result.background || "").toUpperCase());
  result.brothersAsset = whiteBackground ? ASSETS.branding.brothersDark : ASSETS.branding.myMundialLogo;
  return result;
}

function drawShirtFabric(ctx, { size, fabricTheme }) {
  ctx.fillStyle = fabricTheme?.background || SHIRT_BG;
  ctx.fillRect(0, 0, size, size);

  const patternColour = fabricTheme?.patternColour || "#FFFFFF";

  if (fabricTheme?.pattern === "argentina-stripes") {
    const colours = ["#75AADB", "#FFFFFF", "#75AADB", "#FFFFFF", "#75AADB"];
    const stripeWidth = size / colours.length;
    colours.forEach((colour, index) => {
      ctx.fillStyle = colour;
      ctx.fillRect(index * stripeWidth, 0, stripeWidth + 1, size);
    });
  }

  if (fabricTheme?.pattern === "croatia-checker") {
    const cell = size / 5;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        ctx.fillStyle = (row + col) % 2 === 1 ? "#C7222A" : "#FFFFFF";
        ctx.fillRect(col * cell, row * cell, cell + 1, cell + 1);
      }
    }
  }

  if (fabricTheme?.pattern === "stripes") {
    const stripeWidth = size / 5;
    ctx.fillStyle = patternColour;
    [1, 3].forEach((index) => ctx.fillRect(index * stripeWidth, 0, stripeWidth + 1, size));
  }

  if (fabricTheme?.pattern === "hoops") {
    const hoopHeight = size / 5;
    ctx.fillStyle = patternColour;
    [1, 3].forEach((index) => ctx.fillRect(0, index * hoopHeight, size, hoopHeight + 1));
  }

  if (fabricTheme?.pattern === "checkerboard") {
    const cell = size / 5;
    ctx.fillStyle = patternColour;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if ((row + col) % 2 === 1) ctx.fillRect(col * cell, row * cell, cell + 1, cell + 1);
      }
    }
  }

  const glow = ctx.createRadialGradient(size * 0.5, size * 0.14, 0, size * 0.5, size * 0.14, size * 0.58);
  glow.addColorStop(0, "rgba(255,255,255,0.14)");
  glow.addColorStop(0.58, "rgba(255,255,255,0.03)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  const shade = ctx.createLinearGradient(0, 0, 0, size);
  shade.addColorStop(0, "rgba(255,255,255,0.07)");
  shade.addColorStop(1, "rgba(0,0,0,0.065)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
}

function drawCenteredCanvasText(ctx, text, x, y, options = {}) {
  const {
    fontSize = 100,
    colour = IVORY,
    family = "SportsDINBold, Arial Black, sans-serif",
    weight = 900,
    maxWidth = null,
    strokeColour = null,
    strokeWidth = 0,
    shadow = true,
    shadowColour = "rgba(0,0,0,0.14)",
    shadowOffsetY = Math.max(2, fontSize * 0.04),
    shadowStroke = false,
  } = options;

  const widthArg = maxWidth || undefined;
  const hasStroke = Boolean(strokeColour && strokeWidth > 0);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${weight} ${fontSize}px ${family}`;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  // Render one combined silhouette shadow first. This avoids the old export bug where
  // the stroked outline and filled number each cast their own separate shadow.
  if (shadow) {
    const sx = x;
    const sy = y + shadowOffsetY;
    if (hasStroke && shadowStroke) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = shadowColour;
      ctx.strokeText(text, sx, sy, widthArg);
    }
    ctx.fillStyle = shadowColour;
    ctx.fillText(text, sx, sy, widthArg);
  }

  if (hasStroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColour;
    ctx.strokeText(text, x, y, widthArg);
  }
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y, widthArg);
  ctx.restore();
}

export async function createShirtPosterBlob({
  team,
  name,
  number,
  background,
  textColour,
  numberColour,
  composition,
  showMondayLogo = true,
  showBrothers = true,
  showName = true,
  showNumber = true,
  textOutlineEnabled = false,
  numberOutlineEnabled = false,
  outlineColour = IVORY,
  outlineWeight = 0,
  fontType = "bold",
  patternMode = "team",
  patternColour = "#FFFFFF",
}) {
  const size = 2000;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const fabricTheme = canvasShirtFabricTheme(team, background, textColour, numberColour, {
    patternMode,
    patternColour,
  });
  drawShirtFabric(ctx, { size, fabricTheme });

  const [mondayLogo, brothersLogo, brothersDarkLogo] = await Promise.all([
    loadCanvasImage(ASSETS.branding.mondayLogo),
    loadCanvasImage(ASSETS.branding.myMundialLogo),
    loadCanvasImage(ASSETS.branding.brothersDark),
  ]);

  const safeComposition = { ...DEFAULT_COMPOSITION, ...(composition || {}) };
  const scale = size / 318;
  const shirtFontFamily = fontType === "light" ? "SportsDIN, Arial Black, sans-serif" : fontType === "regular" ? "SportsDIN, Arial Black, sans-serif" : "SportsDINBold, Arial Black, sans-serif";
  if (showMondayLogo) {
    const mondayHeight = Math.max(24, Math.min(64, 38 * Number(safeComposition.mondayScale || 1))) * scale;
    const mondayWidth = mondayHeight * 1.05;
    drawImageContain(
      ctx,
      mondayLogo,
      size * 0.5 + Number(safeComposition.mondayX || 0) * scale,
      size * 0.10 + Number(safeComposition.mondayY || 0) * scale,
      mondayWidth,
      mondayHeight,
    );
  }

  const displayName = cleanName(name, "MONDAY");
  const nameLength = displayName.length;
  const nameBase = nameLength > 12 ? 31 : nameLength > 9 ? 39 : 50;
  const lockedNameScale = DEFAULT_COMPOSITION.nameScale;
  const nameFontSize = Math.max(28, Math.min(72, nameBase * lockedNameScale)) * scale;
  if (showName) {
    drawCenteredCanvasText(
      ctx,
      displayName,
      size * 0.5 + Number(safeComposition.nameX || 0) * scale,
      size * 0.30 + Number(safeComposition.nameY || 0) * scale,
      {
        fontSize: nameFontSize,
        colour: fabricTheme.textColour,
        family: shirtFontFamily,
        maxWidth: size * 0.88,
        strokeColour: textOutlineEnabled ? outlineColour : null,
        strokeWidth: textOutlineEnabled ? Math.max(0, Number(outlineWeight || 0)) * scale : 0,
      },
    );
  }

  const displayNumber = cleanNumber(number, "11");
  const rawNumberFont = Math.max(280, Math.min(760, 430 * DEFAULT_COMPOSITION.numberScale));
  const viewBoxScale = (size * 0.94) / 1000;
  const numberFontSize = rawNumberFont * viewBoxScale;
  const numberOpticalX = displayNumber === "4" ? -10 * scale : 0;
  if (showNumber) {
    drawCenteredCanvasText(
      ctx,
      displayNumber,
      size * 0.5 + Number(safeComposition.numberX || 0) * scale + numberOpticalX,
      size * 0.60 + Number(safeComposition.numberY || 0) * scale,
      {
        fontSize: numberFontSize,
        colour: fabricTheme.numberColour,
        family: shirtFontFamily,
        maxWidth: size * 0.94,
        strokeColour: fabricTheme.numberOutlineEnabled ? fabricTheme.numberOutlineColour : (numberOutlineEnabled ? outlineColour : null),
        // Match the SVG preview: outline width lives in the 1000px number viewBox,
        // not the 318px poster composition scale.
        strokeWidth: fabricTheme.numberOutlineEnabled ? fabricTheme.numberOutlineWidth * viewBoxScale : (numberOutlineEnabled ? Math.max(0, Number(outlineWeight || 0)) * viewBoxScale : 0),
        shadow: true,
        shadowColour: "rgba(0,0,0,0.12)",
        shadowOffsetY: 7 * scale,
        shadowStroke: false,
      },
    );
  }

  if (showBrothers) {
    const brothersImage = fabricTheme.brothersAsset === ASSETS.branding.brothersDark ? brothersDarkLogo : brothersLogo;
    const brothersWidthPct = Math.max(8, Math.min(26, 14 * Number(safeComposition.brothersScale || 0.65)));
    drawImageContain(
      ctx,
      brothersImage,
      size * 0.5 + Number(safeComposition.brothersX || 0) * scale,
      size * 0.90 + Number(safeComposition.brothersY || 0) * scale,
      size * (brothersWidthPct / 100),
      size * 0.09,
    );
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The shirt image could not be created"));
    }, "image/png", 0.95);
  });
}

export function normaliseInitialShirt(initialShirt, currentUser) {
  const defaultName = usernameFromUser(currentUser);
  return {
    team: initialShirt?.team || "",
    name: cleanName(initialShirt?.name, defaultName),
    number: cleanNumber(initialShirt?.number, "11"),
    bg: initialShirt?.bg || SHIRT_BG,
    textColour: initialShirt?.textColour || IVORY,
    numberColour: initialShirt?.numberColour || initialShirt?.textColour || IVORY,
    composition: {
      ...DEFAULT_COMPOSITION,
      ...(initialShirt?.layoutVersion >= SHIRT_LAYOUT_VERSION ? (initialShirt?.composition || {}) : {}),
      // Keep the production shirt print layout fixed even if old saved data exists.
      nameScale: DEFAULT_COMPOSITION.nameScale,
      numberScale: DEFAULT_COMPOSITION.numberScale,
      brothersScale: DEFAULT_COMPOSITION.brothersScale,
    },
  };
}

function CloseIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8.8 12.2l6.4-3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="M8.8 12.2l6.4 3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="6.4" cy="12" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="5.9" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="18.1" r="2.45" stroke="currentColor" strokeWidth="2.35" />
    </svg>
  );
}

function CheckIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5 12.4l4.15 4.15L19 6.9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close shirt creator"
      className="flex h-10 w-10 items-center justify-center justify-self-end text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]"
    >
      <CloseIcon className="h-6 w-6" />
    </button>
  );
}

function ExportButton({ icon, label, onClick, disabled, primary = false, busy = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex h-14 items-center justify-center gap-2 rounded-[18px] border px-3 text-center home-copy-bold text-[11px] font-black uppercase leading-none tracking-[0.12em] shadow-[0_8px_18px_rgba(0,0,0,0.18)] disabled:cursor-default disabled:opacity-60 ${primary ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/82 text-[#F5F1E8]"}`}
    >
      {icon}
      <span>{busy ? "WAIT" : label}</span>
    </button>
  );
}

export default function ShirtShareModal({ open, onClose, currentUser = null, initialShirt = null, onSaveShirt = null }) {
  const frameRef = useRef(null);
  const defaultShirt = useMemo(() => normaliseInitialShirt(initialShirt, currentUser), [initialShirt, currentUser]);
  const [team, setTeam] = useState(defaultShirt.team);
  const [name, setName] = useState(defaultShirt.name);
  const [number, setNumber] = useState(defaultShirt.number);
  const [customBg, setCustomBg] = useState(defaultShirt.bg);
  const [textColour, setTextColour] = useState(defaultShirt.textColour);
  const [numberColour, setNumberColour] = useState(defaultShirt.numberColour);
  const [composition, setComposition] = useState(defaultShirt.composition);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = normaliseInitialShirt(initialShirt, currentUser);
    setTeam(next.team);
    setName(next.name);
    setNumber(next.number);
    setCustomBg(next.bg);
    setTextColour(next.textColour);
    setNumberColour(next.numberColour);
    setComposition(next.composition);
  }, [open, initialShirt, currentUser]);

  if (!open) return null;

  const selectedTheme = team ? getTeamTheme(team) : null;
  const shirtBackground = selectedTheme?.bg || customBg || SHIRT_BG;
  const shirtTextColour = selectedTheme?.text || textColour || IVORY;
  const shirtNumberColour = selectedTheme?.text || numberColour || shirtTextColour;

  const buildPayload = () => ({
    team,
    name: cleanName(name, usernameFromUser(currentUser)),
    number: cleanNumber(number, "11"),
    bg: team ? selectedTheme?.bg : shirtBackground,
    textColour: shirtTextColour,
    numberColour: shirtNumberColour,
    composition,
    layoutVersion: SHIRT_LAYOUT_VERSION,
    updatedAt: Date.now(),
  });

  const makeBlob = async () => {
    if (!frameRef.current) throw new Error("Shirt preview not found");
    try {
      if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
      return await createShirtPosterBlob({
        team,
        name: cleanName(name, usernameFromUser(currentUser)),
        number: cleanNumber(number, "11"),
        background: shirtBackground,
        textColour: shirtTextColour,
        numberColour: shirtNumberColour,
        composition,
      });
    } catch (error) {
      console.warn("Dedicated shirt export failed, falling back to DOM capture", error);
      return captureShareElementBlob(frameRef.current, team || null);
    }
  };

  const withBusy = async (label, action) => {
    if (busy) return;
    setBusy(label);
    try {
      await action();
    } catch (error) {
      console.error(`Shirt ${label} failed`, error);
      window.alert("Sorry, that shirt action failed. Please try another option.");
    } finally {
      setBusy("");
    }
  };

  const handleSave = () => withBusy("saving", async () => {
    await onSaveShirt?.(buildPayload());
    onClose?.();
  });

  const handleShare = () => withBusy("sharing", async () => {
    const blob = await makeBlob();
    try {
      await shareNativeImage(blob, "monday-cup-shirt.png", { title: "Monday Cup Shirt", text: "My Monday Cup shirt" });
    } catch (error) {
      console.warn("Native shirt share unavailable, falling back", error);
      await shareOrDownloadResult({ blob, filename: "monday-cup-shirt.png" });
    }
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-[#031B12]/72 px-3 py-[max(14px,env(safe-area-inset-top))] text-[#F5F1E8] backdrop-blur-[6px]">
      <div className="absolute inset-0 bg-[#051A11]/58 backdrop-blur-[3px]" aria-hidden="true" />
      <div className="relative z-[1] w-full max-w-[410px] max-h-[calc(100dvh-28px)] overflow-y-auto rounded-[28px] border border-[#F5F1E8]/16 p-3.5 shadow-[0_20px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(245,241,232,0.08)] sm:p-4" style={{ ...PITCH_MOW_BACKGROUND_STYLE, backgroundColor: "#2C7041", backgroundBlendMode: "multiply" }}>
        <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
          <div />
          <div className="min-w-0 text-center">
            <div className="home-copy-bold text-[clamp(21px,5.8vw,25px)] font-black uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">SHIRT PRINTING</div>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="mx-auto mt-3 aspect-square w-full max-w-[318px] overflow-hidden border border-[#F5F1E8]/20 bg-[#073B26] shadow-[0_12px_28px_rgba(0,0,0,0.24)] ring-1 ring-[#F7D117]/24">
          <div ref={frameRef} className="h-full w-full">
            <ShirtPosterPreview
              shirtTeam={team}
              shirtName={cleanName(name, usernameFromUser(currentUser))}
              shirtNumber={cleanNumber(number, "11")}
              shirtShowMondayLogo={true}
              shirtShowBrothers={true}
              shirtShowTeam={false}
              shirtShowName={true}
              shirtShowNumber={true}
              shirtBgMode="custom"
              shirtCustomBg={shirtBackground}
              shirtTextColour={shirtTextColour}
              shirtNumberColour={shirtNumberColour}
              shirtOutlineEnabled={false}
              shirtOutlineColour={IVORY}
              shirtFontWeight="900"
              shirtFontStyle="normal"
              shirtFontType="bold"
              shirtOutlineWeight={0}
              shirtMondayScale={composition.mondayScale}
              shirtNameScale={composition.nameScale}
              shirtNumberScale={composition.numberScale}
              shirtBrothersScale={composition.brothersScale}
              shirtNameNumberLocked={false}
              shirtMondayX={composition.mondayX}
              shirtMondayY={composition.mondayY}
              shirtNameX={composition.nameX}
              shirtNameY={composition.nameY}
              shirtNumberX={composition.numberX}
              shirtNumberY={composition.numberY}
              shirtBrothersX={composition.brothersX}
              shirtBrothersY={composition.brothersY}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2.5">
          <label className="grid gap-1 text-left">
            <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">Team fabric</span>
            <select value={team} onChange={(event) => setTeam(event.target.value)} className="h-10 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-3 home-copy-bold text-[12px] font-black uppercase tracking-[0.08em] text-[#F5F1E8] outline-none">
              <option value="">SELECT TEAM</option>
              {TEAM_OPTIONS.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)_76px] gap-2.5">
            <label className="grid gap-1 text-left">
              <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">Name</span>
              <input value={name} onChange={(event) => setName(cleanName(event.target.value, ""))} className="h-10 min-w-0 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-2.5 home-copy-bold text-[12px] font-black uppercase tracking-[0.06em] text-[#F5F1E8] outline-none" />
            </label>
            <label className="grid gap-1 text-left">
              <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">No.</span>
              <input inputMode="numeric" min="0" max="99" value={number} onChange={(event) => setNumber(cleanNumber(event.target.value, ""))} className="h-10 min-w-0 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-2 text-center home-copy-bold text-[12px] font-black uppercase tracking-[0.04em] text-[#F5F1E8] outline-none" />
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ExportButton
            onClick={handleShare}
            disabled={Boolean(busy)}
            primary
            icon={<ShareIcon className="h-5 w-5" />}
            label="Share"
            busy={busy === "sharing"}
          />
          <ExportButton
            onClick={handleSave}
            disabled={Boolean(busy)}
            primary
            icon={<CheckIcon className="h-5 w-5" />}
            label="Save"
            busy={busy === "saving"}
          />
        </div>
      </div>
    </div>
  );
}
