import { ASSETS } from "../data/assets.js";
import { GAME, getDirection } from "../logic/penaltyEngine.js";
import { buildCrowdRows, DEFAULT_CROWD_COLOURS } from "../components/crowd/SharedCrowdBackdrop.jsx";
import { getMondayCupShieldVisuals } from "../logic/matchVisuals.js";
import { EXPORT_PITCH_CROP_RATIO, MATCH_RESULT_EXPORT_VISUALS, resolveFallbackExportVisuals } from "../logic/exportVisuals.js";

export const MATCH_SHARE_EXPORT_SIZE = 1600;

const LED_YELLOW = "#F7D117";
const IVORY = "#F5F1E8";
const DARK_GREEN = "#072D1D";
const PITCH_GREEN = "#0d6c3d";
const MONDAY_CUP_AD_SRC = "/assets/branding/mondaycup_co_uk.png";

const DEFAULT_DESIGN = {
  scoreboardHeight: 34,
  textColour: LED_YELLOW,
  fontType: "led",
  outlineWeight: 0,
  outlineColour: DARK_GREEN,
  showStage: true,
  stageBox: true,
  stageScale: 1,
  stageX: 0,
  stageY: 0,
  showFlags: true,
  flagScale: 1,
  flagAX: 0,
  flagAY: 0,
  flagBX: 0,
  flagBY: 0,
  showTeamCodes: true,
  teamScale: 1,
  teamAX: 0,
  teamAY: 0,
  teamBX: 0,
  teamBY: 0,
  showScore: true,
  scoreDisplayMode: "score",
  scoreScale: 1,
  scoreX: 0,
  scoreY: 0,
  markerBox: true,
  markerScale: 1,
  markerAX: 0,
  markerAY: 0,
  markerBX: 0,
  markerBY: 0,
  usernameScale: 1,
  usernameX: 0,
  usernameY: 0,
  flashBox: true,
  flashScale: 1,
  flashX: 0,
  flashY: 0,
  flashFontType: "bold",
  flashOutlineWeight: 0,
  flashOutlineColour: DARK_GREEN,
  badgeScale: 1,
  badgeX: 0,
  badgeY: 0,
  goalkeeperScale: 1,
  ballScale: 1,
};


function clamp(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function fontFamilyFor(value) {
  if (value === "led") return '"IntoDotMatrix", ui-monospace, monospace';
  if (value === "light") return '"SportsDINLight", "SportsDINRegular", sans-serif';
  if (value === "regular") return '"SportsDINRegular", sans-serif';
  return '"SportsDINBold", "SportsDINRegular", sans-serif';
}

function safeTeam(team, fallbackName = "TEAM") {
  const name = team?.name || team?.id || fallbackName;
  return {
    id: team?.id || name,
    name,
    code: team?.code || String(name).slice(0, 3).toUpperCase(),
    flag: team?.flag || "",
    primaryColour: team?.primaryColour || "#0B5F35",
    textColour: team?.textColour || IVORY,
  };
}

function cleanText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim().toUpperCase();
}

function imageSourceVariants(src) {
  const raw = String(src || "").trim();
  if (!raw) return [];
  const variants = [raw];

  try {
    if (typeof window !== "undefined" && window.location?.origin && raw.startsWith("/")) {
      variants.push(new URL(raw, window.location.origin).href);
    }
  } catch {
    // Ignore URL normalisation failures; the raw source is still tried.
  }

  return Array.from(new Set(variants));
}

function shouldUseAnonymousCors(src) {
  try {
    if (!src || String(src).startsWith("data:") || String(src).startsWith("blob:")) return false;
    if (typeof window === "undefined" || !window.location?.origin) return true;
    return new URL(src, window.location.origin).origin !== window.location.origin;
  } catch {
    return true;
  }
}

function loadCanvasImage(src) {
  const variants = imageSourceVariants(src);

  return new Promise((resolve) => {
    if (!variants.length) return resolve(null);

    let index = 0;
    const tryNext = () => {
      const currentSrc = variants[index];
      if (!currentSrc) return resolve(null);

      const image = new Image();
      image.decoding = "async";
      if (shouldUseAnonymousCors(currentSrc)) image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => {
        index += 1;
        if (index < variants.length) tryNext();
        else resolve(null);
      };
      image.src = currentSrc;
    };

    tryNext();
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = String(dataUrl || "").split(",");
  const match = header.match(/^data:([^;]+);base64$/);
  if (!match || !base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: match[1] || "image/png" });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    const finish = (blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The match share image could not be created"));
    };

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) return finish(blob);
        try {
          finish(dataUrlToBlob(canvas.toDataURL("image/png", 0.95)));
        } catch {
          finish(null);
        }
      }, "image/png", 0.95);
      return;
    }

    try {
      finish(dataUrlToBlob(canvas.toDataURL("image/png", 0.95)));
    } catch {
      finish(null);
    }
  });
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, colour) {
  ctx.save();
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.restore();
}

function strokeRoundRect(ctx, x, y, width, height, radius, colour, lineWidth = 1) {
  ctx.save();
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function drawImageContain(ctx, image, centerX, centerY, boxW, boxH) {
  if (!image?.naturalWidth || !image?.naturalHeight) return false;
  const scale = Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  return true;
}

function drawImageCover(ctx, image, x, y, width, height) {
  if (!image?.naturalWidth || !image?.naturalHeight) return false;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  return true;
}

function drawCenteredText(ctx, text, x, y, options = {}) {
  const {
    family = fontFamilyFor("bold"),
    size = 40,
    weight = 900,
    colour = IVORY,
    maxWidth = undefined,
    letterSpacing = 0,
    strokeColour = null,
    strokeWidth = 0,
    shadowColour = null,
    shadowBlur = 0,
    shadowOffsetY = 0,
    baseline = "middle",
  } = options;
  const content = String(text ?? "");

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = baseline;
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.lineJoin = "round";
  if (shadowColour) {
    ctx.shadowColor = shadowColour;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffsetY;
  }

  if (letterSpacing && content.length > 1) {
    const chars = Array.from(content);
    const widths = chars.map((char) => ctx.measureText(char).width);
    const total = widths.reduce((sum, width) => sum + width, 0) + letterSpacing * (chars.length - 1);
    let cursor = x - total / 2;
    chars.forEach((char, index) => {
      const charX = cursor + widths[index] / 2;
      if (strokeColour && strokeWidth > 0) {
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = strokeColour;
        ctx.strokeText(char, charX, y);
      }
      ctx.fillStyle = colour;
      ctx.fillText(char, charX, y);
      cursor += widths[index] + letterSpacing;
    });
  } else {
    if (strokeColour && strokeWidth > 0) {
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = strokeColour;
      ctx.strokeText(content, x, y, maxWidth);
    }
    ctx.fillStyle = colour;
    ctx.fillText(content, x, y, maxWidth);
  }
  ctx.restore();
}

function drawDotMatrix(ctx, x, y, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "rgba(247,209,23,0.24)";
  const spacingX = width / 58;
  const spacingY = height / 17;
  const radius = Math.max(1.4, width * 0.0019);
  for (let py = y + spacingY * 0.8; py < y + height - spacingY * 0.25; py += spacingY) {
    for (let px = x + spacingX * 0.7; px < x + width - spacingX * 0.25; px += spacingX) {
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function transformedBox(baseX, baseY, width, height, { x = 0, y = 0, scale = 1 } = {}) {
  const s = Number(scale) || 1;
  const w = width * s;
  const h = height * s;
  return {
    x: baseX + (Number(x) || 0) - (w - width) / 2,
    y: baseY + (Number(y) || 0) - (h - height) / 2,
    width: w,
    height: h,
  };
}

function drawFlag(ctx, image, x, y, width, height, options = {}) {
  const radius = Math.max(4, width * 0.105);
  const outerStroke = Math.max(1.4, width * 0.026);
  const innerStroke = Math.max(0.7, width * 0.012);
  ctx.save();

  // Draw the actual flag full-bleed inside the rounded clip, then outline only.
  // No ivory backing is drawn here: the DOM flag is hidden before capture, so any
  // extra fill behind the canvas flag appears as a detached white box on export.
  ctx.save();
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  if (image) {
    drawImageCover(ctx, image, x, y, width, height);
  } else {
    ctx.fillStyle = "#0B5F35";
    ctx.fillRect(x, y, width, height);
  }
  ctx.restore();

  const outline = options.outline || LED_YELLOW;
  ctx.save();
  ctx.shadowColor = options.glow || "rgba(247,209,23,0.16)";
  ctx.shadowBlur = options.glowBlur ?? Math.max(1.5, width * 0.035);
  strokeRoundRect(ctx, x + outerStroke / 2, y + outerStroke / 2, width - outerStroke, height - outerStroke, radius, outline, outerStroke);
  ctx.restore();

  strokeRoundRect(
    ctx,
    x + outerStroke + innerStroke / 2,
    y + outerStroke + innerStroke / 2,
    width - outerStroke * 2 - innerStroke,
    height - outerStroke * 2 - innerStroke,
    Math.max(2, radius - outerStroke),
    "rgba(3,27,18,0.26)",
    innerStroke,
  );
  ctx.restore();
}

function drawCapturedScoreboardFlagOverlays(ctx, props, assets, size, yOffset = 0) {
  const d = { ...DEFAULT_DESIGN, ...(props.matchDesign || {}) };
  if (d.showFlags === false) return;
  const boardH = size * (clamp(d.scoreboardHeight, 24, 46, 34) / 100);
  const mainH = boardH * 0.76;
  const row1 = mainH * 0.30;
  const row2 = mainH * 0.45;
  const r2Y = row1 + row2 / 2 + yOffset;
  const fractions = [0.72, 1.1, 0.75, 0.3, 0.75, 1.1, 0.72];
  const total = fractions.reduce((sum, value) => sum + value, 0);
  const widths = fractions.map((value) => (value / total) * size);
  const centers = widths.map((width, index) => widths.slice(0, index).reduce((sum, value) => sum + value, 0) + width / 2);
  const teamACenterX = centers[1];
  const teamBCenterX = centers[5];
  const unit = size / 400;
  const flagW = 25 * unit * (Number(d.flagScale) || 1);
  const flagH = 17 * unit * (Number(d.flagScale) || 1);
  const leftX = centers[0] - flagW / 2 + ((Number(d.flagAX) || 0) + 7) * unit;
  const rightX = centers[6] - flagW / 2 + ((Number(d.flagBX) || 0) - 7) * unit;
  const y = r2Y - flagH / 2;

  ctx.save();
  // The captured DOM flags are hidden before capture. Draw only the clean export
  // flag objects here, directly over the live scoreboard background. No cover
  // texture panel is used, which keeps the dot-matrix grid continuous.
  drawFlag(ctx, assets.flagA, leftX, y + (Number(d.flagAY) || 0) * unit, flagW, flagH, { outline: LED_YELLOW });
  drawFlag(ctx, assets.flagB, rightX, y + (Number(d.flagBY) || 0) * unit, flagW, flagH, { outline: LED_YELLOW });
  ctx.restore();
}

function drawMarkers(ctx, markers = [], totalSlots = 5, x, y, scale = 1) {
  const MAX_VISIBLE_MARKERS = 10;
  const displaySlots = Math.min(totalSlots, MAX_VISIBLE_MARKERS);
  const sourceMarkers = Array.isArray(markers) ? markers : [];
  const startIndex = totalSlots > MAX_VISIBLE_MARKERS ? Math.max(0, sourceMarkers.length - MAX_VISIBLE_MARKERS) : 0;
  const slicedMarkers = sourceMarkers.slice(startIndex, startIndex + displaySlots);
  const visible = Array.from({ length: displaySlots }).map((_, index) => slicedMarkers[index] || "");
  const dot = 13 * scale;
  const gap = 7 * scale;
  const totalWidth = visible.length * dot + Math.max(0, visible.length - 1) * gap;
  let cursor = x - totalWidth / 2 + dot / 2;
  visible.forEach((marker) => {
    const fill = marker === "G" ? "#22C55E" : marker === "S" ? "#EF4444" : LED_YELLOW;
    ctx.save();
    ctx.shadowColor = fill;
    ctx.shadowBlur = Math.max(1.2, dot * 0.22);
    ctx.beginPath();
    ctx.arc(cursor, y, dot / 2, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    cursor += dot + gap;
  });
}

function flashFontSize(copy, baseScale, exportSize = MATCH_SHARE_EXPORT_SIZE) {
  // Constant size for all commentary; set to comfortably fit the longest export copy.
  return 15.5 * (exportSize / 400) * baseScale;
}

function drawScoreboard(ctx, props, assets, size) {
  const {
    userTeam,
    opponentTeam,
    score,
    stageTitle,
    flashText,
    flashStyle,
    showMarkers,
    markerText,
    usernameEnabled,
    username,
    teamAMarkers,
    teamBMarkers,
    totalMarkerSlots,
    matchDesign,
  } = props;
  const d = { ...DEFAULT_DESIGN, ...(matchDesign || {}) };
  const boardH = size * (clamp(d.scoreboardHeight, 24, 46, 34) / 100);
  const mainH = boardH * 0.76;
  const flashH = boardH - mainH;
  const family = fontFamilyFor(d.fontType);
  const textColour = d.textColour || LED_YELLOW;
  const strokeWidth = clamp(d.outlineWeight, 0, 16, 0) * (size / 400);
  const strokeColour = strokeWidth > 0 ? d.outlineColour || DARK_GREEN : null;

  ctx.save();
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, size, mainH);
  ctx.strokeStyle = "rgba(245,241,232,0.18)";
  ctx.lineWidth = Math.max(2, size * 0.0012);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, mainH);
  ctx.lineTo(size, mainH);
  ctx.stroke();
  drawDotMatrix(ctx, size * 0.005, size * 0.005, size * 0.99, mainH - size * 0.01);

  const row1 = mainH * 0.30;
  const row2 = mainH * 0.45;
  const row3 = mainH - row1 - row2;
  const r1Y = row1 / 2;
  const r2Y = row1 + row2 / 2;
  const r3Y = row1 + row2 + row3 / 2;

  if (d.showStage) {
    const box = transformedBox(size / 2 - size * 0.17, r1Y - size * 0.026, size * 0.34, size * 0.052, {
      x: (Number(d.stageX) || 0) * (size / 400),
      y: (Number(d.stageY) || 0) * (size / 400),
      scale: d.stageScale,
    });
    if (d.stageBox) {
      fillRoundRect(ctx, box.x, box.y, box.width, box.height, size * 0.012, "#050505");
      strokeRoundRect(ctx, box.x, box.y, box.width, box.height, size * 0.012, "rgba(245,241,232,0.22)", Math.max(1.5, size * 0.001));
    }
    drawCenteredText(ctx, cleanText(stageTitle, "FINAL"), box.x + box.width / 2, box.y + box.height / 2, {
      family,
      size: size * 0.029,
      weight: 900,
      colour: textColour,
      maxWidth: box.width * 0.92,
      letterSpacing: size * 0.0034,
      strokeColour,
      strokeWidth,
      shadowColour: "rgba(247,209,23,0.18)",
      shadowBlur: size * 0.005,
    });
  }

  const fractions = [0.72, 1.1, 0.75, 0.3, 0.75, 1.1, 0.72];
  const total = fractions.reduce((sum, value) => sum + value, 0);
  const widths = fractions.map((value) => (value / total) * size);
  const centers = widths.map((width, index) => widths.slice(0, index).reduce((sum, value) => sum + value, 0) + width / 2);
  const teamACenterX = centers[1];
  const teamBCenterX = centers[5];
  const unit = size / 400;

  if (d.showFlags) {
    const flagW = 25 * unit * (Number(d.flagScale) || 1);
    const flagH = 17 * unit * (Number(d.flagScale) || 1);
    drawFlag(ctx, assets.flagA, centers[0] - flagW / 2 + ((Number(d.flagAX) || 0) + 7) * unit, r2Y - flagH / 2 + (Number(d.flagAY) || 0) * unit, flagW, flagH);
    drawFlag(ctx, assets.flagB, centers[6] - flagW / 2 + ((Number(d.flagBX) || 0) - 7) * unit, r2Y - flagH / 2 + (Number(d.flagBY) || 0) * unit, flagW, flagH);
  }

  const codeSize = size * 0.079 * (Number(d.teamScale) || 1);
  if (d.showTeamCodes) {
    drawCenteredText(ctx, userTeam.code, teamACenterX + (Number(d.teamAX) || 0) * unit, r2Y + (Number(d.teamAY) || 0) * unit, {
      family,
      size: codeSize,
      weight: 900,
      colour: textColour,
      maxWidth: widths[1] * 0.92,
      strokeColour,
      strokeWidth,
      shadowColour: "rgba(247,209,23,0.18)",
      shadowBlur: size * 0.004,
    });
    drawCenteredText(ctx, opponentTeam.code, teamBCenterX + (Number(d.teamBX) || 0) * unit, r2Y + (Number(d.teamBY) || 0) * unit, {
      family,
      size: codeSize,
      weight: 900,
      colour: textColour,
      maxWidth: widths[5] * 0.92,
      strokeColour,
      strokeWidth,
      shadowColour: "rgba(247,209,23,0.18)",
      shadowBlur: size * 0.004,
    });
  }

  if (d.showScore) {
    const scoreSize = size * 0.079 * (Number(d.scoreScale) || 1);
    if (d.scoreDisplayMode === "vs") {
      drawCenteredText(ctx, "VS", (centers[2] + centers[4]) / 2 + (Number(d.scoreX) || 0) * unit, r2Y + (Number(d.scoreY) || 0) * unit, {
        family,
        size: scoreSize,
        weight: 900,
        colour: textColour,
        maxWidth: widths[2] + widths[3] + widths[4],
        strokeColour,
        strokeWidth,
        shadowColour: "rgba(247,209,23,0.18)",
        shadowBlur: size * 0.004,
      });
    } else {
      const sy = r2Y + (Number(d.scoreY) || 0) * unit;
      const sx = (Number(d.scoreX) || 0) * unit;
      drawCenteredText(ctx, score?.user ?? 0, centers[2] + sx, sy, { family, size: scoreSize, weight: 900, colour: textColour, maxWidth: widths[2], strokeColour, strokeWidth, shadowColour: "rgba(247,209,23,0.18)", shadowBlur: size * 0.004 });
      drawCenteredText(ctx, "-", centers[3] + sx, sy, { family, size: scoreSize, weight: 900, colour: textColour, maxWidth: widths[3], strokeColour, strokeWidth, shadowColour: "rgba(247,209,23,0.18)", shadowBlur: size * 0.004 });
      drawCenteredText(ctx, score?.opponent ?? 0, centers[4] + sx, sy, { family, size: scoreSize, weight: 900, colour: textColour, maxWidth: widths[4], strokeColour, strokeWidth, shadowColour: "rgba(247,209,23,0.18)", shadowBlur: size * 0.004 });
    }
  }

  if (showMarkers) {
    drawMarkers(ctx, teamAMarkers, totalMarkerSlots, teamACenterX + ((Number(d.teamAX) || 0) + (Number(d.markerAX) || 0)) * unit, r3Y + (Number(d.markerAY) || 0) * unit, Number(d.markerScale) || 1);
    drawMarkers(ctx, teamBMarkers, totalMarkerSlots, teamBCenterX + ((Number(d.teamBX) || 0) + (Number(d.markerBX) || 0)) * unit, r3Y + (Number(d.markerBY) || 0) * unit, Number(d.markerScale) || 1);

    const usernameBoxW = size * 0.29 * (Number(d.usernameScale) || 1);
    const usernameBoxH = Math.max(size * 0.039, row3 * 0.62) * (Number(d.usernameScale) || 1);
    const usernameBoxX = size / 2 - usernameBoxW / 2 + (Number(d.usernameX) || 0) * unit;
    const usernameBoxY = r3Y - usernameBoxH / 2 + (Number(d.usernameY) || 0) * unit;
    if (usernameEnabled) {
      fillRoundRect(ctx, usernameBoxX, usernameBoxY, usernameBoxW, usernameBoxH, size * 0.012, "#050505");
      strokeRoundRect(ctx, usernameBoxX, usernameBoxY, usernameBoxW, usernameBoxH, size * 0.012, "rgba(245,241,232,0.22)", Math.max(1.5, size * 0.001));
      drawCenteredText(ctx, cleanText(username, "GUEST"), usernameBoxX + usernameBoxW / 2, usernameBoxY + usernameBoxH / 2, {
        family,
        size: size * 0.023 * (Number(d.usernameScale) || 1),
        weight: 900,
        colour: textColour,
        maxWidth: usernameBoxW * 0.84,
        letterSpacing: size * 0.0028,
        strokeColour,
        strokeWidth,
        });
    }
  } else {
    const markerBoxW = size * 0.42 * (Number(d.markerScale) || 1);
    const markerBoxH = size * 0.045 * (Number(d.markerScale) || 1);
    const markerBoxX = size / 2 - markerBoxW / 2 + (Number(d.markerAX) || 0) * unit;
    const markerBoxY = r3Y - markerBoxH / 2 + (Number(d.markerAY) || 0) * unit;
    if (d.markerBox) {
      fillRoundRect(ctx, markerBoxX, markerBoxY, markerBoxW, markerBoxH, size * 0.012, "#050505");
      strokeRoundRect(ctx, markerBoxX, markerBoxY, markerBoxW, markerBoxH, size * 0.012, "rgba(245,241,232,0.22)", Math.max(1.5, size * 0.001));
    }
    drawCenteredText(ctx, cleanText(markerText, "PENALTIES"), markerBoxX + markerBoxW / 2, markerBoxY + markerBoxH / 2, {
      family,
      size: size * 0.026 * (Number(d.markerScale) || 1),
      weight: 900,
      colour: textColour,
      maxWidth: markerBoxW * 0.86,
      letterSpacing: size * 0.003,
      strokeColour,
      strokeWidth,
    });
  }

  const flashBg = d.flashBox ? flashStyle?.background || userTeam.primaryColour : "transparent";
  if (d.flashBox) {
    ctx.fillStyle = flashBg;
    ctx.fillRect(0, mainH, size, flashH);
    const gloss = ctx.createLinearGradient(0, mainH, 0, mainH + flashH);
    gloss.addColorStop(0, "rgba(255,255,255,0.16)");
    gloss.addColorStop(0.48, "rgba(255,255,255,0.03)");
    gloss.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = gloss;
    ctx.fillRect(0, mainH, size, flashH);
  }

  const flashCopy = cleanText(flashText, "SHARE YOUR RESULT");
  const flashScale = Number(d.flashScale) || 1;
  drawCenteredText(ctx, flashCopy, size / 2 + (Number(d.flashX) || 0) * unit, mainH + flashH / 2 + (Number(d.flashY) || 0) * unit, {
    family: fontFamilyFor(d.flashFontType),
    size: flashFontSize(flashCopy, flashScale, size),
    weight: 900,
    colour: flashStyle?.color || IVORY,
    maxWidth: size * 0.94,
    letterSpacing: size * 0.0022,
    strokeColour: clamp(d.flashOutlineWeight, 0, 16, 0) > 0 ? d.flashOutlineColour || DARK_GREEN : null,
    strokeWidth: clamp(d.flashOutlineWeight, 0, 16, 0) * unit,
  });
  ctx.restore();
  return boardH;
}

function drawCrowdPerson(ctx, x, y, scale, shirt, skin, pose, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x - 9 * scale, y - 15 * scale);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = shirt;
  ctx.beginPath();
  if (pose === "up") {
    ctx.moveTo(5, 13);
    ctx.lineTo(1, 6);
    ctx.moveTo(13, 13);
    ctx.lineTo(17, 6);
  } else {
    ctx.moveTo(5, 13);
    ctx.lineTo(2, 20);
    ctx.moveTo(13, 13);
    ctx.lineTo(16, 20);
  }
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(9, 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shirt;
  drawRoundRect(ctx, 4, 11, 10, 12, 3);
  ctx.fill();
  ctx.fillStyle = "#0b2d1d";
  drawRoundRect(ctx, 5, 22, 3, 8, 1.5);
  ctx.fill();
  drawRoundRect(ctx, 10, 22, 3, 8, 1.5);
  ctx.fill();
  ctx.restore();
}

function drawCrowd(ctx, x, y, width, height, visuals = MATCH_RESULT_EXPORT_VISUALS.fallback) {
  ctx.save();
  ctx.fillStyle = "#123822";
  ctx.fillRect(x, y, width, height);

  const bg = ctx.createLinearGradient(0, y, 0, y + height);
  bg.addColorStop(0, "rgba(5,26,17,0.52)");
  bg.addColorStop(0.3, "rgba(5,26,17,0.28)");
  bg.addColorStop(0.58, "rgba(5,26,17,0.18)");
  bg.addColorStop(1, "rgba(5,26,17,0.10)");
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);

  const leftGlow = ctx.createRadialGradient(x + width * 0.18, y + height * 0.1, 0, x + width * 0.18, y + height * 0.1, width * 0.18);
  leftGlow.addColorStop(0, "rgba(245,241,232,0.05)");
  leftGlow.addColorStop(1, "rgba(245,241,232,0)");
  ctx.fillStyle = leftGlow;
  ctx.fillRect(x, y, width, height);

  const rightGlow = ctx.createRadialGradient(x + width * 0.82, y + height * 0.14, 0, x + width * 0.82, y + height * 0.14, width * 0.16);
  rightGlow.addColorStop(0, "rgba(255,214,0,0.04)");
  rightGlow.addColorStop(1, "rgba(255,214,0,0)");
  ctx.fillStyle = rightGlow;
  ctx.fillRect(x, y, width, height);

  [
    { top: 0.06, h: 0.06, alpha: 0.10 },
    { top: 0.16, h: 0.07, alpha: 0.08 },
    { top: 0.28, h: 0.08, alpha: 0.10 },
    { top: 0.41, h: 0.09, alpha: 0.08 },
    { top: 0.55, h: 0.10, alpha: 0.10 },
    { top: 0.70, h: 0.11, alpha: 0.08 },
    { top: 0.85, h: 0.10, alpha: 0.10 },
  ].forEach(({ top, h, alpha }) => {
    ctx.fillStyle = `rgba(11,45,29,${alpha})`;
    ctx.fillRect(x, y + height * top, width, height * h);
  });

  const crowd = visuals?.crowd || {};
  const crowdRows = buildCrowdRows({ crowdColours: DEFAULT_CROWD_COLOURS, density: crowd.density ?? 1, rowCount: crowd.rowCount ?? 16 });
  crowdRows.forEach((person) => {
    const px = x + width * (person.x / 100);
    const py = y + height * (person.y / 100);
    const personScale = person.scale * (width / 400);
    drawCrowdPerson(ctx, px, py, personScale, person.shirt, person.skin, person.pose, person.opacity * (crowd.personOpacityScale ?? 1));
  });
  ctx.restore();
}

function drawPitchMow(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#0b5f35";
  ctx.fillRect(x, y, width, height);
  const stripeW = width / 9;
  for (let i = 0; i < 9; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#0f7444" : "#0b5f35";
    ctx.fillRect(x + i * stripeW, y, stripeW + 1, height);
  }
  const glow = ctx.createRadialGradient(x + width / 2, y, 0, x + width / 2, y, width * 0.34);
  glow.addColorStop(0, "rgba(247,209,23,0.045)");
  glow.addColorStop(1, "rgba(247,209,23,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, width, height);
  const shade = ctx.createLinearGradient(0, y, 0, y + height);
  shade.addColorStop(0, "rgba(245,241,232,0.018)");
  shade.addColorStop(1, "rgba(5,26,17,0.10)");
  ctx.fillStyle = shade;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function drawGoal(ctx, x, y, width, height, visuals = MATCH_RESULT_EXPORT_VISUALS.fallback) {
  const goal = GAME.goal;
  const gx = x + width * (goal.left / 100);
  const gy = y + height * ((goal.top / 100) * EXPORT_PITCH_CROP_RATIO);
  const gw = width * (goal.width / 100);
  const gh = height * ((goal.height / 100) * EXPORT_PITCH_CROP_RATIO);
  const line = Math.max(18, width * 0.018);

  ctx.save();
  ctx.fillStyle = "rgba(13,108,61,0.30)";
  ctx.fillRect(gx, gy, gw, gh);
  ctx.strokeStyle = "#f5f1e8";
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(gx, gy);
  ctx.lineTo(gx + gw, gy);
  ctx.lineTo(gx + gw, gy + gh);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx + line / 2, gy + line / 2, gw - line, gh - line / 2);
  ctx.clip();
  ctx.globalAlpha = visuals?.goal?.netOpacity ?? 0.55;

  // Match the live GoalFrame visual emphasis: visible vertical and horizontal mesh,
  // without the previous export-only pronounced diagonal stroke pattern.
  ctx.strokeStyle = "rgba(245,241,232,0.18)";
  ctx.lineWidth = Math.max(1.1, gw * 0.002);
  const verticalGap = gw * 0.022;
  for (let px = gx + verticalGap * 0.92; px <= gx + gw; px += verticalGap) {
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.lineTo(px, gy + gh);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(245,241,232,0.16)";
  ctx.lineWidth = Math.max(1.1, gh * 0.003);
  const horizontalGap = gh * 0.031;
  for (let py = gy + horizontalGap * 0.9; py <= gy + gh; py += horizontalGap) {
    ctx.beginPath();
    ctx.moveTo(gx, py);
    ctx.lineTo(gx + gw, py);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.restore();
}

function drawAdvertisingBoard(ctx, image, x, y, width, height, visuals = MATCH_RESULT_EXPORT_VISUALS.fallback) {
  ctx.save();
  ctx.fillStyle = "#072D1D";
  ctx.fillRect(x, y, width, height);
  const grad = ctx.createLinearGradient(0, y, 0, y + height);
  grad.addColorStop(0, "rgba(255,255,255,0.045)");
  grad.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(245,241,232,0.10)";
  ctx.lineWidth = Math.max(1.5, width * 0.0015);
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x + width, y + 1);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.moveTo(x, y + height - 1);
  ctx.lineTo(x + width, y + height - 1);
  ctx.stroke();
  const adBoard = visuals?.adBoard || {};
  const logoW = width * (adBoard.logoWidthRatio ?? 0.671);
  const logoH = height * (adBoard.logoHeightRatio ?? 0.759);
  const cx = x + width / 2;
  const cy = y + height / 2;

  if (image) {
    ctx.save();
    ctx.globalAlpha = adBoard.logoOpacity ?? 0.84;
    ctx.filter = adBoard.logoFilter || "brightness(0.94)";
    ctx.shadowColor = adBoard.shadowColor || "rgba(245,241,232,0.20)";
    ctx.shadowBlur = adBoard.shadowBlur ?? 9;
    drawImageContain(ctx, image, cx, cy, logoW, logoH);
    ctx.restore();
  } else {
    // Last-resort canvas fallback for mobile/Safari image decode misses.
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.shadowColor = "rgba(245,241,232,0.18)";
    ctx.shadowBlur = Math.max(7, width * 0.008);
    drawCenteredText(ctx, "MONDAYCUP.CO.UK", cx, cy, {
      family: fontFamilyFor("bold"),
      size: Math.max(22, height * 0.34),
      weight: 900,
      colour: "rgba(245,241,232,0.74)",
      maxWidth: width * 0.70,
      letterSpacing: width * 0.001,
      strokeColour: "rgba(3,27,18,0.42)",
      strokeWidth: Math.max(1.5, width * 0.0016),
    });
    ctx.restore();
  }
  ctx.restore();
}

function drawBadgeOverlay(ctx, badgeMode, assets, x, y, width, height, d) {
  if (!badgeMode || badgeMode === "none") return;
  const scale = Number(d.badgeScale) || 1;
  const offsetX = (Number(d.badgeX) || 0) * (width / 400);
  const offsetY = (Number(d.badgeY) || 0) * (width / 400);
  const badgeMap = {
    monday: { image: assets.mondayLogo, w: width * 0.99825, h: height * 0.74415, top: 0.39, glow: null },
    champion: { image: assets.champion, w: width * 0.898425, h: height * 0.669735, top: 0.39, glow: LED_YELLOW, glowOuter: "rgba(247,209,23,0.18)", glowMid: "rgba(247,209,23,0.075)" },
    runnerUp: { image: assets.runnerUp, w: width * 0.898425, h: height * 0.669735, top: 0.39, glow: IVORY, glowOuter: "rgba(245,241,232,0.16)", glowMid: "rgba(216,216,216,0.07)" },
    third: { image: assets.third, w: width * 0.898425, h: height * 0.669735, top: 0.39, glow: "#C8863A", glowOuter: "rgba(200,134,58,0.18)", glowMid: "rgba(200,134,58,0.075)" },
  };
  const resolvedBadgeMode = badgeMode === "mondayCup" ? "monday" : badgeMode;
  const badge = badgeMap[resolvedBadgeMode] || badgeMap.monday;
  const cx = x + width / 2 + offsetX;
  const cy = y + height * badge.top + offsetY;
  const boxW = badge.w * scale;
  const boxH = badge.h * scale;

  ctx.save();
  if (resolvedBadgeMode === "monday") {
    const mondayShield = getMondayCupShieldVisuals();
    const outerGlow = ctx.createRadialGradient(cx, cy + boxH * 0.08, 0, cx, cy + boxH * 0.08, boxW * 0.5);
    outerGlow.addColorStop(0, mondayShield.glowOuter);
    outerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + boxH * 0.08, boxW * 0.34, boxH * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(cx, cy + boxH * 0.08, 0, cx, cy + boxH * 0.08, boxW * 0.32);
    innerGlow.addColorStop(0, mondayShield.glowInner);
    innerGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + boxH * 0.08, boxW * 0.24, boxH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.filter = mondayShield.shadow;
  } else if (badge.glow) {
    const glow = ctx.createRadialGradient(cx, cy + boxH * 0.06, 0, cx, cy + boxH * 0.06, boxW * 0.5);
    glow.addColorStop(0, badge.glowOuter || "rgba(247,209,23,0.18)");
    glow.addColorStop(0.58, badge.glowMid || "rgba(247,209,23,0.07)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + boxH * 0.08, boxW * 0.34, boxH * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (resolvedBadgeMode !== "monday") {
    ctx.filter = "drop-shadow(0 18px 24px rgba(0,0,0,0.30))";
  }
  drawImageContain(ctx, badge.image, cx, cy, boxW, boxH);
  ctx.filter = "none";
  ctx.restore();
}

function positionPoint(value) {
  if (value === "spot") return { ...GAME.spot, direction: null };
  const direction = getDirection(value);
  const goal = GAME.goal;
  return {
    x: goal.left + ((direction.col + 0.5) / 3) * goal.width,
    y: goal.top + ((direction.row + 0.5) / 3) * goal.height,
    direction,
  };
}

function drawActor(ctx, image, x, y, size, shellColour, borderColour, rotate = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotate * Math.PI) / 180);
  ctx.fillStyle = shellColour;
  ctx.beginPath();
  ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = borderColour;
  ctx.lineWidth = Math.max(4, size * 0.045);
  ctx.stroke();
  drawImageContain(ctx, image, 0, 0, size * 0.72, size * 0.72);
  ctx.restore();
}

function drawActors(ctx, props, assets, x, y, width, height, d) {
  const { userTeam, opponentTeam, showGoalkeeper, goalkeeperPosition, showBall, ballPosition } = props;
  if (showGoalkeeper) {
    const keeper = positionPoint(goalkeeperPosition);
    const direction = keeper.direction || getDirection("CM");
    const actorSize = width * 0.11 * (Number(d.goalkeeperScale) || 1);
    const px = x + width * (keeper.x / 100);
    const py = y + height * (keeper.y / 100);
    const rotate = direction.col === 0 ? -18 : direction.col === 2 ? 18 : 0;
    drawActor(ctx, assets.goalkeeper, px, py, actorSize, opponentTeam.primaryColour, opponentTeam.textColour, rotate);
  }
  if (showBall) {
    const ball = positionPoint(ballPosition);
    const actorSize = width * 0.095 * (Number(d.ballScale) || 1);
    const px = x + width * (ball.x / 100);
    const py = y + height * (ball.y / 100);
    drawActor(ctx, assets.ball, px, py, actorSize, userTeam.primaryColour, userTeam.textColour, 0);
  }
}

function drawPitchArea(ctx, props, assets, y, width, height) {
  const d = { ...DEFAULT_DESIGN, ...(props.matchDesign || {}) };
  const exportVisuals = resolveFallbackExportVisuals(MATCH_RESULT_EXPORT_VISUALS);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y, width, height);
  ctx.clip();
  ctx.fillStyle = PITCH_GREEN;
  ctx.fillRect(0, y, width, height);

  const virtualHeight = height * EXPORT_PITCH_CROP_RATIO;
  const goalLine = GAME.goal.top + GAME.goal.height;
  const crowdHeight = virtualHeight * ((goalLine - 8) / 100);
  const boardY = y + virtualHeight * ((goalLine - 8) / 100);
  const boardH = virtualHeight * (8 / 100);
  const mowY = y + virtualHeight * (goalLine / 100);

  drawCrowd(ctx, 0, y, width, crowdHeight, exportVisuals);
  drawAdvertisingBoard(ctx, assets.adBoard, 0, boardY, width, boardH, exportVisuals);
  drawPitchMow(ctx, 0, mowY, width, virtualHeight - (mowY - y));
  drawGoal(ctx, 0, y, width, height, exportVisuals);
  drawBadgeOverlay(ctx, props.badgeMode, assets, 0, y, width, height, d);
  drawActors(ctx, props, assets, 0, y, width, height, d);
  ctx.restore();
}

async function preloadImagesInElement(element) {
  if (!element) return;
  const images = Array.from(element.querySelectorAll?.("img") || []);
  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const finish = () => resolve();
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      if (img.decode) img.decode().then(finish).catch(() => null);
      setTimeout(finish, 900);
    });
  }));
}

async function captureScoreboardImageFromDom(sourceElement, exportSize) {
  const root = sourceElement || null;
  const scoreboard = root?.querySelector?.('[data-share-scoreboard="true"]');
  if (!root || !scoreboard) return null;
  if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
  await preloadImagesInElement(scoreboard);

  const explicitFlagNodes = Array.from(scoreboard.querySelectorAll?.('[data-share-export-flag]') || []);
  const legacyFlagImageNodes = Array.from(scoreboard.querySelectorAll?.('img[alt$=" flag"], img[alt*=" flag"]') || []);
  const hiddenFlagNodes = Array.from(new Set([
    ...explicitFlagNodes,
    ...legacyFlagImageNodes.map((node) => node.closest?.("span") || node),
  ])).filter(Boolean);
  const hiddenFlagStyles = hiddenFlagNodes.map((node) => ({
    node,
    opacity: node.style.opacity,
    visibility: node.style.visibility,
  }));
  hiddenFlagNodes.forEach((node) => {
    node.style.opacity = "0";
    node.style.visibility = "hidden";
  });

  const glowNodes = Array.from(scoreboard.querySelectorAll?.(".led-text-glow") || []);
  const glowStyles = glowNodes.map((node) => ({
    node,
    textShadow: node.style.textShadow,
    filter: node.style.filter,
  }));
  glowNodes.forEach((node) => {
    node.style.textShadow = "none";
    node.style.filter = "none";
  });

  const restoreCaptureStyles = () => {
    hiddenFlagStyles.forEach(({ node, opacity, visibility }) => {
      node.style.opacity = opacity;
      node.style.visibility = visibility;
    });
    glowStyles.forEach(({ node, textShadow, filter }) => {
      node.style.textShadow = textShadow;
      node.style.filter = filter;
    });
  };

  const rootRect = root.getBoundingClientRect?.();
  const boardRect = scoreboard.getBoundingClientRect?.();
  const rootWidth = Math.max(1, rootRect?.width || 0);
  const rootHeight = Math.max(1, rootRect?.height || 0);
  const boardWidth = Math.max(1, boardRect?.width || rootWidth);
  const boardHeight = Math.max(1, boardRect?.height || (rootHeight * 0.34));
  const scaledHeight = Math.max(1, Math.round((boardHeight / rootHeight) * exportSize));

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(scoreboard, {
      cacheBust: true,
      width: Math.round(boardWidth),
      height: Math.round(boardHeight),
      pixelRatio: Math.max(2, exportSize / boardWidth),
      backgroundColor: "#050505",
      filter: (node) => !node?.dataset?.shareExportIgnore,
      style: {
        animation: "none",
        transition: "none",
        transform: "none",
      },
    });
    const image = await loadCanvasImage(dataUrl);
    restoreCaptureStyles();
    if (!image) return null;
    return { image, height: scaledHeight };
  } catch (error) {
    restoreCaptureStyles();
    console.warn("Match scoreboard DOM capture failed; falling back to canvas scoreboard", error);
    return null;
  }
}

async function capturePitchImageFromDom(sourceElement, exportSize, exportPitchHeight) {
  const root = sourceElement || null;
  const pitch = root?.querySelector?.('[data-share-pitch-frame="true"]') || root?.querySelector?.('[data-share-export-pitch="true"]');
  if (!root || !pitch) return null;
  if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
  await preloadImagesInElement(pitch);

  const pitchRect = pitch.getBoundingClientRect?.();
  const pitchWidth = Math.max(1, pitchRect?.width || root.getBoundingClientRect?.()?.width || 0);
  const pitchHeight = Math.max(1, pitchRect?.height || 0);
  const targetHeight = Math.max(1, Math.round(exportPitchHeight || exportSize));

  try {
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(pitch, {
      cacheBust: true,
      width: Math.round(pitchWidth),
      height: Math.round(pitchHeight),
      pixelRatio: Math.max(2, exportSize / pitchWidth),
      backgroundColor: "#0d6c3d",
      filter: (node) => !node?.dataset?.shareExportIgnore,
      style: {
        animation: "none",
        transition: "none",
      },
    });
    const image = await loadCanvasImage(dataUrl);
    return { image, width: exportSize, height: targetHeight };
  } catch (error) {
    console.warn("Match pitch DOM capture failed; falling back to canvas pitch", error);
    return null;
  }
}


async function loadAssets(userTeam, opponentTeam) {
  const [flagA, flagB, adBoard, mondayLogo, champion, runnerUp, third, goalkeeper, ball] = await Promise.all([
    loadCanvasImage(userTeam.flag),
    loadCanvasImage(opponentTeam.flag),
    loadCanvasImage(MONDAY_CUP_AD_SRC),
    loadCanvasImage(ASSETS.branding.mondayLogo),
    loadCanvasImage(ASSETS.badges.champion),
    loadCanvasImage(ASSETS.badges.runnerUp),
    loadCanvasImage(ASSETS.badges.third),
    loadCanvasImage(ASSETS.game.goalkeeper),
    loadCanvasImage(ASSETS.game.ball),
  ]);
  return { flagA, flagB, adBoard, mondayLogo, champion, runnerUp, third, goalkeeper, ball };
}

export async function createMatchShareBlob(props = {}, options = {}) {
  const size = MATCH_SHARE_EXPORT_SIZE;
  const userTeam = safeTeam(props.userTeam, "TEAM A");
  const opponentTeam = safeTeam(props.opponentTeam, "TEAM B");

  if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
  const assets = await loadAssets(userTeam, opponentTeam);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.fillStyle = PITCH_GREEN;
  ctx.fillRect(0, 0, size, size);
  const normalisedProps = { ...props, userTeam, opponentTeam };
  const capturedScoreboard = await captureScoreboardImageFromDom(options.sourceElement, size);
  let boardH;
  if (capturedScoreboard?.image) {
    const scoreboardUpShift = 0;
    boardH = Math.max(1, capturedScoreboard.height);
    ctx.drawImage(capturedScoreboard.image, 0, -scoreboardUpShift, size, capturedScoreboard.height);
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.globalCompositeOperation = "screen";
    ctx.filter = `blur(${Math.max(2.4, size * 0.0032)}px)`;
    ctx.drawImage(capturedScoreboard.image, 0, -scoreboardUpShift, size, capturedScoreboard.height);
    ctx.restore();
    drawCapturedScoreboardFlagOverlays(ctx, normalisedProps, assets, size, -scoreboardUpShift);
  } else {
    boardH = drawScoreboard(ctx, normalisedProps, assets, size);
  }
  // Mobile Safari/html-to-image can report a successful pitch capture while dropping
  // nested image assets inside the pitch layer (badge/logo/ad-board). The scoreboard
  // still uses DOM capture for pixel-perfect text, but the pitch is rendered directly
  // to canvas so the badge and mondaycup.co.uk board are always present in exports.
  drawPitchArea(ctx, normalisedProps, assets, boardH, size, size - boardH);

  if (props.borderEnabled) {
    ctx.save();
    ctx.strokeStyle = props.borderColour || "#0B5F35";
    ctx.lineWidth = Math.max(10, size * 0.0075);
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth);
    ctx.restore();
  }

  return canvasToBlob(canvas);
}
