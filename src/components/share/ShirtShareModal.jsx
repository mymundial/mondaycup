import { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "../../data/assets.js";
import {
  captureShareElementBlob,
  shareNativeImage,
  shareOrDownloadResult,
} from "../../utils/shareExport.js";
import { ShirtPosterPreview } from "./SharePreviews.jsx";

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
const SHIRT_STORY_WIDTH = 1080;
const SHIRT_STORY_HEIGHT = 1920;
const SHIRT_EXPORT_SIZE = 2000;

function colourChannels(value) {
  const raw = String(value || "").trim();
  const hex = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const body = hex[1].length === 3
      ? hex[1].split("").map((part) => part + part).join("")
      : hex[1];
    return [0, 2, 4].map((index) => parseInt(body.slice(index, index + 2), 16));
  }
  const rgb = raw.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
  if (rgb) return [1, 2, 3].map((index) => Math.max(0, Math.min(255, Number(rgb[index]))));
  return null;
}

function colourLuminance(value) {
  const channels = colourChannels(value);
  if (!channels) return 0;
  const [r, g, b] = channels.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function needsDarkBrothersLogo(background) {
  return colourLuminance(background) >= 0.54;
}

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

export function cleanName(value, fallback = "GUEST") {
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

function clampOutlineWeight(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(2, numeric));
}

export function usernameFromUser(currentUser) {
  return cleanName(currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST", "GUEST");
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
  const result = {
    background: fallbackBackground || SHIRT_BG,
    textColour: fallbackText || IVORY,
    numberColour: fallbackNumber || fallbackText || IVORY,
    numberOutlineEnabled: false,
    numberOutlineColour: patternOptions.outlineColour || "#000000",
    numberOutlineWidth: 0,
    pattern: null,
    patternColour: patternOptions.patternColour || LED_YELLOW,
    brothersAsset: ASSETS.branding.myMundialLogo,
  };

  const manualPattern = patternOptions.patternMode || "plain";
  if (manualPattern && manualPattern !== "plain") result.pattern = manualPattern;
  result.patternColour = patternOptions.patternColour || result.patternColour || LED_YELLOW;

  result.brothersAsset = needsDarkBrothersLogo(result.background) ? ASSETS.branding.brothersDark : ASSETS.branding.myMundialLogo;
  return result;
}

function drawShirtFabric(ctx, { size, width = size, height = size, fabricTheme }) {
  const w = Math.max(1, Number(width) || Number(size) || SHIRT_EXPORT_SIZE);
  const h = Math.max(1, Number(height) || Number(size) || SHIRT_EXPORT_SIZE);

  ctx.fillStyle = fabricTheme?.background || SHIRT_BG;
  ctx.fillRect(0, 0, w, h);

  const patternColour = fabricTheme?.patternColour || "#FFFFFF";

  if (fabricTheme?.pattern === "argentina-stripes") {
    const colours = ["#75AADB", "#FFFFFF", "#75AADB", "#FFFFFF", "#75AADB"];
    const stripeWidth = w / colours.length;
    colours.forEach((colour, index) => {
      ctx.fillStyle = colour;
      ctx.fillRect(index * stripeWidth, 0, stripeWidth + 1, h);
    });
  }

  if (fabricTheme?.pattern === "croatia-checker") {
    const cellW = w / 5;
    const cellH = h / 5;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        ctx.fillStyle = (row + col) % 2 === 1 ? "#C7222A" : "#FFFFFF";
        ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  if (fabricTheme?.pattern === "stripes") {
    const stripeWidth = w / 5;
    ctx.fillStyle = patternColour;
    [1, 3].forEach((index) => ctx.fillRect(index * stripeWidth, 0, stripeWidth + 1, h));
  }

  if (fabricTheme?.pattern === "hoops") {
    const hoopHeight = h / 5;
    ctx.fillStyle = patternColour;
    [1, 3].forEach((index) => ctx.fillRect(0, index * hoopHeight, w, hoopHeight + 1));
  }

  if (fabricTheme?.pattern === "checkerboard") {
    const cellW = w / 5;
    const cellH = h / 5;
    ctx.fillStyle = patternColour;
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        if ((row + col) % 2 === 1) ctx.fillRect(col * cellW, row * cellH, cellW + 1, cellH + 1);
      }
    }
  }

  const glowRadius = Math.max(w, h) * 0.58;
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.14, 0, w * 0.5, h * 0.14, glowRadius);
  glow.addColorStop(0, "rgba(255,255,255,0.14)");
  glow.addColorStop(0.58, "rgba(255,255,255,0.03)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const shade = ctx.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "rgba(255,255,255,0.07)");
  shade.addColorStop(1, "rgba(0,0,0,0.065)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
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
  numberOutlineWeight = null,
  fontType = "bold",
  patternMode = "team",
  patternColour = LED_YELLOW,
  storyFrame = false,
}) {
  const isStoryFrame = Boolean(storyFrame);
  const canvasWidth = isStoryFrame ? SHIRT_STORY_WIDTH : SHIRT_EXPORT_SIZE;
  const canvasHeight = isStoryFrame ? SHIRT_STORY_HEIGHT : SHIRT_EXPORT_SIZE;
  const squareSize = isStoryFrame ? canvasWidth : SHIRT_EXPORT_SIZE;
  const squareX = Math.round((canvasWidth - squareSize) / 2);
  const squareY = isStoryFrame ? Math.round((canvasHeight - squareSize) / 2) : 0;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const fabricTheme = canvasShirtFabricTheme(team, background, textColour, numberColour, {
    patternMode,
    patternColour,
    outlineColour,
  });
  drawShirtFabric(ctx, { width: canvasWidth, height: canvasHeight, fabricTheme });

  const [mondayLogo, brothersLogo, brothersDarkLogo] = await Promise.all([
    loadCanvasImage(ASSETS.branding.mondayLogo),
    loadCanvasImage(ASSETS.branding.myMundialLogo),
    loadCanvasImage(ASSETS.branding.brothersDark),
  ]);

  const safeComposition = { ...DEFAULT_COMPOSITION, ...(composition || {}) };
  const scale = squareSize / 318;
  const shirtFontFamily = fontType === "light" ? "SportsDIN, Arial Black, sans-serif" : fontType === "regular" ? "SportsDIN, Arial Black, sans-serif" : "SportsDINBold, Arial Black, sans-serif";
  if (showMondayLogo) {
    const mondayHeight = Math.max(24, Math.min(64, 38 * Number(safeComposition.mondayScale || 1))) * scale;
    const mondayWidth = mondayHeight * 1.05;
    drawImageContain(
      ctx,
      mondayLogo,
      squareX + squareSize * 0.5 + Number(safeComposition.mondayX || 0) * scale,
      squareY + squareSize * 0.10 + Number(safeComposition.mondayY || 0) * scale,
      mondayWidth,
      mondayHeight,
    );
  }

  const displayName = cleanName(name, "GUEST");
  const nameLength = displayName.length;
  const nameBase = nameLength > 12 ? 31 : nameLength > 9 ? 39 : 50;
  const lockedNameScale = DEFAULT_COMPOSITION.nameScale;
  const nameFontSize = Math.max(28, Math.min(72, nameBase * lockedNameScale)) * scale;
  if (showName) {
    drawCenteredCanvasText(
      ctx,
      displayName,
      squareX + squareSize * 0.5 + Number(safeComposition.nameX || 0) * scale,
      squareY + squareSize * 0.30 + Number(safeComposition.nameY || 0) * scale,
      {
        fontSize: nameFontSize,
        colour: fabricTheme.textColour,
        family: shirtFontFamily,
        maxWidth: squareSize * 0.88,
        strokeColour: textOutlineEnabled ? outlineColour : null,
        strokeWidth: textOutlineEnabled ? Math.max(0, Number(outlineWeight || 0)) * scale : 0,
      },
    );
  }

  const displayNumber = cleanNumber(number, "11");
  const rawNumberFont = Math.max(280, Math.min(760, 430 * DEFAULT_COMPOSITION.numberScale));
  const viewBoxScale = (squareSize * 0.94) / 1000;
  const numberFontSize = rawNumberFont * viewBoxScale;
  const numberOpticalX = displayNumber === "4" ? -10 * scale : 0;
  if (showNumber) {
    drawCenteredCanvasText(
      ctx,
      displayNumber,
      squareX + squareSize * 0.5 + Number(safeComposition.numberX || 0) * scale + numberOpticalX,
      squareY + squareSize * 0.60 + Number(safeComposition.numberY || 0) * scale,
      {
        fontSize: numberFontSize,
        colour: fabricTheme.numberColour,
        family: shirtFontFamily,
        maxWidth: squareSize * 0.94,
        strokeColour: fabricTheme.numberOutlineEnabled ? fabricTheme.numberOutlineColour : (numberOutlineEnabled ? outlineColour : null),
        // Match the SVG preview: outline width lives in the 1000px number viewBox,
        // not the 318px poster composition scale.
        strokeWidth: fabricTheme.numberOutlineEnabled ? fabricTheme.numberOutlineWidth * viewBoxScale : (numberOutlineEnabled ? Math.max(0, Number(numberOutlineWeight ?? outlineWeight ?? 0)) * scale * 3 : 0),
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
      squareX + squareSize * 0.5 + Number(safeComposition.brothersX || 0) * scale,
      squareY + squareSize * 0.90 + Number(safeComposition.brothersY || 0) * scale,
      squareSize * (brothersWidthPct / 100),
      squareSize * 0.09,
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
  const savedName = String(initialShirt?.name || "").trim().toUpperCase();
  const savedLooksLikeOldDefault = savedName === "MONDAY";
  return {
    team: "",
    name: savedLooksLikeOldDefault ? defaultName : cleanName(initialShirt?.name, defaultName),
    number: cleanNumber(initialShirt?.number, "11"),
    bg: initialShirt?.bg || SHIRT_BG,
    patternMode: initialShirt?.patternMode || "plain",
    patternColour: initialShirt?.patternColour || LED_YELLOW,
    textColour: initialShirt?.textColour || IVORY,
    numberColour: initialShirt?.numberColour || initialShirt?.textColour || IVORY,
    outlineColour: initialShirt?.outlineColour || "#000000",
    nameOutlineWidth: Math.max(0, Number(initialShirt?.nameOutlineWidth ?? initialShirt?.outlineWeight ?? 0) || 0),
    numberOutlineWidth: Math.max(0, Number(initialShirt?.numberOutlineWidth ?? initialShirt?.outlineWeight ?? 0) || 0),
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

const editorFieldClass = "h-10 min-w-0 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/62 px-2.5 text-center home-copy-bold text-[12px] font-black uppercase tracking-[0.06em] text-[#F5F1E8] outline-none focus:border-[#F7D117]/70";
const editorPanelClass = "mt-2.5 grid h-[96px] items-center gap-2.5 rounded-[18px] border border-[#F5F1E8]/10 bg-[#031B12]/24 p-2.5";

function EditorLabel({ label, children }) {
  return (
    <label className="grid gap-1 text-center">
      <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{label}</span>
      {children}
    </label>
  );
}

function ColourField({ label, value, onChange }) {
  return (
    <EditorLabel label={label}>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="mx-auto h-10 w-12 cursor-pointer rounded-[10px] border border-[#F5F1E8]/18 bg-transparent p-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.16)]"
        aria-label={label}
      />
    </EditorLabel>
  );
}

function OutlineToggle({ checked, onChange }) {
  return (
    <label className="grid gap-1 text-center">
      <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">OUTLINE</span>
      <button
        type="button"
        onClick={() => onChange?.(!checked)}
        className={`flex h-9 items-center justify-center rounded-[12px] border home-copy-bold text-[8px] uppercase tracking-[0.08em] ${checked ? "border-[#F7D117]/82 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/16 bg-[#051A11]/62 text-[#F5F1E8]/82"}`}
        aria-pressed={checked}
      >
        {checked ? "ON" : "OFF"}
      </button>
    </label>
  );
}

function RangeField({ label, value, onChange, min = 0, max = 12, step = 1, formatValue = null }) {
  const rawValue = Number(value || 0);
  const numericValue = Math.max(min, Math.min(max, Number.isFinite(rawValue) ? rawValue : min));
  const displayValue = formatValue ? formatValue(numericValue) : numericValue;
  return (
    <EditorLabel label={label}>
      <div className="grid h-10 grid-cols-[1fr_44px] items-center gap-2 rounded-[13px] border border-[#F5F1E8]/18 bg-[#051A11]/62 px-2.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={numericValue}
          onChange={(event) => onChange?.(Number(event.target.value))}
          className="w-full accent-[#F7D117]"
        />
        <span className="text-right home-copy-bold text-[11px] text-[#F7D117]">{displayValue}</span>
      </div>
    </EditorLabel>
  );
}

function ShirtEditorPanelButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[46px] items-center justify-center rounded-[15px] border px-2 text-center transition ${
        active
          ? "border-[#F7D117]/82 bg-[#F7D117] text-[#072D1D] shadow-[0_7px_18px_rgba(0,0,0,0.22)]"
          : "border-[#F5F1E8]/16 bg-[#051A11]/58 text-[#F5F1E8]/84"
      }`}
    >
      <span className="home-copy-bold text-[9px] uppercase leading-none tracking-[0.08em]">{label}</span>
    </button>
  );
}

function PatternSelector({ value, onChange }) {
  const options = [
    { value: "plain", label: "PLAIN" },
    { value: "stripes", label: "STRIPES" },
    { value: "hoops", label: "HOOPS" },
    { value: "checkerboard", label: "CHECKS" },
  ];
  return (
    <div className="grid gap-1 text-center">
      <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">PATTERN</span>
      <div className="grid grid-cols-4 gap-1.5">
        {options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => onChange?.(option.value)}
            className={`h-9 rounded-[12px] border home-copy-bold text-[8px] uppercase tracking-[0.08em] ${value === option.value ? "border-[#F7D117]/82 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/16 bg-[#051A11]/62 text-[#F5F1E8]/82"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ShirtShareModal({ open, onClose, currentUser = null, initialShirt = null, onSaveShirt = null }) {
  const frameRef = useRef(null);
  const defaultShirt = useMemo(() => normaliseInitialShirt(initialShirt, currentUser), [initialShirt, currentUser]);
  const [team] = useState("");
  const [name, setName] = useState(defaultShirt.name);
  const [number, setNumber] = useState(defaultShirt.number);
  const [customBg, setCustomBg] = useState(defaultShirt.bg);
  const [patternMode, setPatternMode] = useState(defaultShirt.patternMode);
  const [patternColour, setPatternColour] = useState(defaultShirt.patternColour);
  const [textColour, setTextColour] = useState(defaultShirt.textColour);
  const [numberColour, setNumberColour] = useState(defaultShirt.numberColour);
  const [outlineColour, setOutlineColour] = useState(defaultShirt.outlineColour);
  const [nameOutlineWidth, setNameOutlineWidth] = useState(clampOutlineWeight(defaultShirt.nameOutlineWidth));
  const [numberOutlineWidth, setNumberOutlineWidth] = useState(clampOutlineWeight(defaultShirt.numberOutlineWidth));
  const [composition, setComposition] = useState(defaultShirt.composition);
  const [busy, setBusy] = useState("");
  const [activePanel, setActivePanel] = useState("personalisation");

  useEffect(() => {
    if (!open) return;
    const next = normaliseInitialShirt(initialShirt, currentUser);
    setName(next.name);
    setNumber(next.number);
    setCustomBg(next.bg);
    setPatternMode(next.patternMode);
    setPatternColour(next.patternColour);
    setTextColour(next.textColour);
    setNumberColour(next.numberColour);
    setOutlineColour(next.outlineColour);
    setNameOutlineWidth(clampOutlineWeight(next.nameOutlineWidth));
    setNumberOutlineWidth(clampOutlineWeight(next.numberOutlineWidth));
    setActivePanel("personalisation");
    setComposition(next.composition);
  }, [open, initialShirt, currentUser]);

  if (!open) return null;

  const shirtBackground = customBg || SHIRT_BG;
  const shirtTextColour = textColour || IVORY;
  const shirtNumberColour = numberColour || shirtTextColour;
  const safeNameOutlineWidth = clampOutlineWeight(nameOutlineWidth);
  const safeNumberOutlineWidth = clampOutlineWeight(numberOutlineWidth);
  const formatOutlineValue = (value) => Number(value).toFixed(value % 1 === 0 ? 0 : 2).replace(/0+$/, "").replace(/\.$/, "");

  const buildPayload = () => ({
    team: "",
    name: cleanName(name, usernameFromUser(currentUser)),
    number: cleanNumber(number, "11"),
    bg: shirtBackground,
    patternMode,
    patternColour,
    textColour: shirtTextColour,
    numberColour: shirtNumberColour,
    outlineColour,
    nameOutlineWidth: safeNameOutlineWidth,
    numberOutlineWidth: safeNumberOutlineWidth,
    composition,
    layoutVersion: SHIRT_LAYOUT_VERSION,
    updatedAt: Date.now(),
  });

  const makeBlob = async ({ storyFrame = false } = {}) => {
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
        textOutlineEnabled: safeNameOutlineWidth > 0,
        numberOutlineEnabled: safeNumberOutlineWidth > 0,
        outlineColour,
        outlineWeight: safeNameOutlineWidth,
        numberOutlineWeight: safeNumberOutlineWidth,
        patternMode,
        patternColour,
        storyFrame,
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
    const blob = await makeBlob({ storyFrame: true });
    try {
      await shareNativeImage(blob, "monday-cup-shirt.png", { title: "Monday Cup Shirt", text: "👕 Designed my Monday Cup shirt.\n\nNow it\'s time to wear it on the pitch.\n\n⚽ mondaycup.co.uk" });
    } catch (error) {
      console.warn("Native shirt share unavailable, falling back", error);
      await shareOrDownloadResult({ blob, filename: "monday-cup-shirt.png" });
    }
  });

  return (
    <div className="fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#031B12]/45 px-3 py-[max(14px,env(safe-area-inset-top))] text-[#F5F1E8] backdrop-blur-[4px]" style={{ zIndex: 2147483647 }}>
      <div className="absolute inset-0 bg-[#051A11]/16 backdrop-blur-[1px]" aria-hidden="true" />
      <div className="relative z-[1] w-full max-w-[408px] max-h-[calc(100dvh-28px)] overflow-y-auto rounded-[28px] border border-[#F5F1E8]/16 p-3.5 shadow-[0_20px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(245,241,232,0.08)] sm:p-4" style={{ ...PITCH_MOW_BACKGROUND_STYLE, backgroundColor: "#2C7041", backgroundBlendMode: "multiply" }}>
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
              shirtTeam=""
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
              shirtOutlineEnabled={safeNameOutlineWidth > 0}
              shirtNumberOutlineEnabled={safeNumberOutlineWidth > 0}
              shirtOutlineColour={outlineColour}
              shirtPatternMode={patternMode}
              shirtPatternColour={patternColour}
              shirtFontWeight="900"
              shirtFontStyle="normal"
              shirtFontType="bold"
              shirtOutlineWeight={safeNameOutlineWidth}
              shirtNumberOutlineWeight={safeNumberOutlineWidth}
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

        <div className="mt-3 rounded-[1.2rem] border border-[#F5F1E8]/12 bg-[#031B12]/22 p-2.5">
          <div className="grid grid-cols-3 gap-1.5">
            <ShirtEditorPanelButton
              label="Personalise"
              active={activePanel === "personalisation"}
              onClick={() => setActivePanel("personalisation")}
            />
            <ShirtEditorPanelButton
              label="Design"
              active={activePanel === "fabric"}
              onClick={() => setActivePanel("fabric")}
            />
            <ShirtEditorPanelButton
              label="Print"
              active={activePanel === "print"}
              onClick={() => setActivePanel("print")}
            />
          </div>

          <div className={editorPanelClass}>
            {activePanel === "personalisation" && (
              <div className="grid w-full grid-cols-[minmax(0,1fr)_76px] items-end gap-2.5">
                <EditorLabel label="Name">
                  <input value={name} onChange={(event) => setName(cleanName(event.target.value, ""))} className={editorFieldClass} />
                </EditorLabel>
                <EditorLabel label="Number">
                  <input inputMode="numeric" min="0" max="99" value={number} onChange={(event) => setNumber(cleanNumber(event.target.value, ""))} className={`${editorFieldClass} text-center`} />
                </EditorLabel>
              </div>
            )}

            {activePanel === "fabric" && (
              <div className="grid w-full grid-cols-[minmax(0,1fr)_76px] items-end gap-2.5">
                <PatternSelector value={patternMode} onChange={setPatternMode} />
                <OutlineToggle
                  checked={safeNameOutlineWidth > 0 || safeNumberOutlineWidth > 0}
                  onChange={(checked) => {
                    setNameOutlineWidth(checked ? 2 : 0);
                    setNumberOutlineWidth(checked ? 2 : 0);
                  }}
                />
              </div>
            )}

            {activePanel === "print" && (
              <div className="grid w-full grid-cols-5 items-end gap-1.5">
                <ColourField label="BG" value={shirtBackground} onChange={setCustomBg} />
                <ColourField label="Pattern" value={patternColour} onChange={setPatternColour} />
                <ColourField label="Name" value={shirtTextColour} onChange={setTextColour} />
                <ColourField label="Number" value={shirtNumberColour} onChange={setNumberColour} />
                <ColourField label="Outline" value={outlineColour} onChange={setOutlineColour} />
              </div>
            )}
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
