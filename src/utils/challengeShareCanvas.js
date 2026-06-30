import { ASSETS } from "../data/assets.js";

export const CHALLENGE_SHARE_EXPORT_SIZE = 1600;

const EXPORT_SIZE = CHALLENGE_SHARE_EXPORT_SIZE;
const IVORY = "#F5F1E8";
const LED_YELLOW = "#F7D117";
const DARK_GREEN = "#031B12";
const PANEL_GREEN = "#0B5F35";
const DEEP_GREEN = "#052D1D";
const CAPE_VERDE_FALLBACK = {
  name: "Cape Verde",
  code: "CPV",
  flag: "/flags/CPV.png",
  primaryColour: "#0B5F35",
  textColour: IVORY,
};

const FONT_FACES = [
  { family: "SportsDINRegular", source: "/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-regular-webfont.woff2", weight: "400" },
  { family: "SportsDINBold", source: "/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-bold-webfont.woff2", weight: "700" },
  { family: "SportsDINLight", source: "/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-light-webfont.woff2", weight: "300" },
];

let fontsPromise = null;

async function ensureFontsReady() {
  if (typeof document === "undefined") return;
  if (!fontsPromise) {
    fontsPromise = (async () => {
      if (document.fonts?.ready) await document.fonts.ready.catch(() => null);
      if (typeof FontFace !== "undefined" && document.fonts?.add) {
        await Promise.all(
          FONT_FACES.map(async ({ family, source, weight }) => {
            try {
              if (document.fonts.check(`${weight} 16px "${family}"`)) return;
              const face = new FontFace(family, `url(${source})`, {
                style: "normal",
                weight,
                display: "block",
              });
              await face.load();
              document.fonts.add(face);
            } catch {
              // Keep going with CSS/browser fallbacks.
            }
          }),
        );
      }
      if (document.fonts?.load) {
        await Promise.all([
          document.fonts.load('400 32px "SportsDINRegular"'),
          document.fonts.load('700 32px "SportsDINBold"'),
          document.fonts.load('300 32px "SportsDINLight"'),
        ].map((promise) => promise.catch(() => null)));
      }
      if (document.fonts?.ready) await document.fonts.ready.catch(() => null);
    })().catch(() => null);
  }
  await fontsPromise;
}

function safeText(value, fallback = "") {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function cleanUpper(value, fallback = "") {
  return safeText(value, fallback).toUpperCase();
}

function safeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
}

function safeRank(value) {
  const rank = Number(value);
  return Number.isFinite(rank) && rank > 0 ? Math.floor(rank) : null;
}

function normaliseTeam(team, fallback = {}) {
  const name = safeText(team?.name, fallback.name || "TEAM");
  return {
    id: team?.id || fallback.id || name,
    name,
    code: cleanUpper(team?.code, fallback.code || name.slice(0, 3)),
    flag: team?.flag || fallback.flag || "",
    primaryColour: team?.primaryColour || fallback.primaryColour || PANEL_GREEN,
    textColour: team?.textColour || fallback.textColour || IVORY,
  };
}

function normaliseAssetUrl(src) {
  const raw = String(src || "").trim();
  if (!raw) return "";
  try {
    if (typeof window !== "undefined" && window.location?.origin) {
      return new URL(raw, window.location.origin).href;
    }
  } catch {
    // Keep raw path.
  }
  return raw;
}

function isSameOriginAsset(src) {
  try {
    if (typeof window === "undefined" || !window.location?.origin) return false;
    return new URL(src, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

function imageFromUrl(src, { anonymous = false } = {}) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const image = new Image();
    image.decoding = "async";
    if (anonymous) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function imageFromFetchedBlob(src) {
  if (!src || typeof fetch !== "function" || !isSameOriginAsset(src)) return null;
  let objectUrl = "";
  try {
    const response = await fetch(src, { cache: "force-cache", credentials: "same-origin" });
    if (!response.ok) return null;
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    const image = await imageFromUrl(objectUrl);
    if (image) {
      image.__challengeShareObjectUrl = objectUrl;
      objectUrl = "";
      return image;
    }
  } catch {
    return null;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
  return null;
}

async function loadCanvasImage(src) {
  const url = normaliseAssetUrl(src);
  if (!url) return null;
  const fetched = await imageFromFetchedBlob(url);
  if (fetched) return fetched;
  return imageFromUrl(url, { anonymous: !isSameOriginAsset(url) });
}

function releaseLoadedImages(images = []) {
  images.forEach((image) => {
    if (image?.__challengeShareObjectUrl) {
      URL.revokeObjectURL(image.__challengeShareObjectUrl);
      image.__challengeShareObjectUrl = "";
    }
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
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

function drawImageContain(ctx, image, cx, cy, maxWidth, maxHeight) {
  if (!image?.naturalWidth || !image?.naturalHeight) return;
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height);
}

function drawFlag(ctx, image, x, y, width, height) {
  ctx.save();
  roundedRect(ctx, x, y, width, height, 12);
  ctx.fillStyle = IVORY;
  ctx.fill();
  ctx.clip();
  if (image?.naturalWidth && image?.naturalHeight) {
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
  }
  ctx.restore();

  ctx.save();
  roundedRect(ctx, x, y, width, height, 12);
  ctx.lineWidth = 4;
  ctx.strokeStyle = LED_YELLOW;
  ctx.stroke();
  ctx.restore();
}

function drawMowedBackground(ctx, width, height) {
  ctx.fillStyle = "#06351F";
  ctx.fillRect(0, 0, width, height);

  const stripeWidth = width / 8;
  for (let index = 0; index < 8; index += 1) {
    ctx.fillStyle = index % 2 === 0 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.12)";
    ctx.fillRect(index * stripeWidth, 0, stripeWidth, height);
  }

  // Side-dot texture, like the mockup, without making the middle noisy.
  ctx.save();
  ctx.fillStyle = "rgba(245,241,232,0.075)";
  for (let y = 38; y < 420; y += 26) {
    for (let x = 24; x < 170; x += 26) {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(width - x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  const topGlow = ctx.createRadialGradient(width * 0.5, height * 0.22, 20, width * 0.5, height * 0.22, height * 0.75);
  topGlow.addColorStop(0, "rgba(247,209,23,0.13)");
  topGlow.addColorStop(0.33, "rgba(245,241,232,0.035)");
  topGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  const bottomGlow = ctx.createRadialGradient(width * 0.5, height * 1.08, 40, width * 0.5, height * 1.08, height * 0.62);
  bottomGlow.addColorStop(0, "rgba(245,241,232,0.16)");
  bottomGlow.addColorStop(0.28, "rgba(13,108,61,0.20)");
  bottomGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, height * 0.54, width, height * 0.46);

  const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, width * 0.1, width * 0.5, height * 0.45, width * 0.78);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.62, "rgba(0,0,0,0.12)");
  vignette.addColorStop(1, "rgba(0,0,0,0.46)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawImpactText(ctx, text, x, y, options = {}) {
  const {
    size = 96,
    maxWidth = EXPORT_SIZE * 0.86,
    minSize = 42,
    colour = IVORY,
    weight = 700,
    strokeColour = "rgba(0,0,0,0.32)",
    strokeWidth = 0,
    shadowColour = "rgba(0,0,0,0.34)",
    shadowDepth = 9,
  } = options;
  const copy = safeText(text);
  const finalSize = fitTextSize(ctx, copy, maxWidth, size, minSize, weight);
  setMainFont(ctx, finalSize, weight);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  for (let step = shadowDepth; step >= 2; step -= 2) {
    ctx.fillStyle = shadowColour;
    ctx.fillText(copy, x, y + step, maxWidth);
  }

  if (strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColour;
    ctx.strokeText(copy, x, y, maxWidth);
  }
  ctx.fillStyle = colour;
  ctx.fillText(copy, x, y, maxWidth);
  ctx.restore();
}

function drawHeroResultLine(ctx, score, y) {
  const scoreText = String(score);
  let fontSize = score >= 10 ? 138 : 154;
  const minSize = 96;
  const gap = 34;
  const maxWidth = EXPORT_SIZE * 0.78;

  while (fontSize > minSize) {
    setMainFont(ctx, fontSize, 700);
    const width = ctx.measureText("I PUT").width + ctx.measureText(scoreText).width + ctx.measureText("PAST").width + gap * 2;
    if (width <= maxWidth) break;
    fontSize -= 3;
  }

  setMainFont(ctx, fontSize, 700);
  const leftWidth = ctx.measureText("I PUT").width;
  const scoreWidth = ctx.measureText(scoreText).width;
  const rightWidth = ctx.measureText("PAST").width;
  const totalWidth = leftWidth + scoreWidth + rightWidth + gap * 2;
  let x = (EXPORT_SIZE - totalWidth) / 2;

  drawImpactText(ctx, "I PUT", x + leftWidth / 2, y, {
    size: fontSize,
    minSize,
    maxWidth: leftWidth + 8,
    colour: LED_YELLOW,
    strokeWidth: 2,
    shadowDepth: 14,
  });
  x += leftWidth + gap;
  drawImpactText(ctx, scoreText, x + scoreWidth / 2, y - 3, {
    size: fontSize + 18,
    minSize,
    maxWidth: scoreWidth + 20,
    colour: IVORY,
    strokeWidth: 2,
    shadowDepth: 15,
  });
  x += scoreWidth + gap;
  drawImpactText(ctx, "PAST", x + rightWidth / 2, y, {
    size: fontSize,
    minSize,
    maxWidth: rightWidth + 8,
    colour: LED_YELLOW,
    strokeWidth: 2,
    shadowDepth: 14,
  });
}

function drawDecorLine(ctx, y, leftX, rightX) {
  ctx.save();
  const gradient = ctx.createLinearGradient(leftX, y, rightX, y);
  gradient.addColorStop(0, "rgba(247,209,23,0)");
  gradient.addColorStop(0.5, "rgba(247,209,23,0.74)");
  gradient.addColorStop(1, "rgba(247,209,23,0)");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(leftX, y);
  ctx.lineTo(rightX, y);
  ctx.stroke();
  ctx.restore();
}

function drawSpark(ctx, x, y, size = 18) {
  ctx.save();
  ctx.fillStyle = LED_YELLOW;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.22, y - size * 0.22);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.22, y + size * 0.22);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.22, y + size * 0.22);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.22, y - size * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function setMainFont(ctx, size, weight = 700) {
  const family = weight >= 700 ? "SportsDINBold" : "SportsDINRegular";
  ctx.font = `${weight} ${size}px "${family}", "Arial Black", Arial, sans-serif`;
}

function fitTextSize(ctx, text, maxWidth, initialSize, minSize, weight = 700) {
  let size = initialSize;
  while (size > minSize) {
    setMainFont(ctx, size, weight);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

function drawCenteredText(ctx, text, x, y, options = {}) {
  const {
    size = 64,
    maxWidth = EXPORT_SIZE * 0.86,
    minSize = 32,
    colour = IVORY,
    weight = 700,
    shadow = true,
    letterSpacing = 0,
  } = options;
  const copy = safeText(text);
  const finalSize = fitTextSize(ctx, copy, maxWidth, size, minSize, weight);
  setMainFont(ctx, finalSize, weight);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = colour;
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.30)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = Math.max(4, finalSize * 0.055);
  }
  if (letterSpacing <= 0) {
    ctx.fillText(copy, x, y, maxWidth);
  } else {
    drawLetterSpacedText(ctx, copy, x, y, letterSpacing, maxWidth);
  }
  ctx.restore();
}

function drawLetterSpacedText(ctx, text, centerX, y, letterSpacing, maxWidth) {
  const chars = Array.from(text);
  let width = 0;
  chars.forEach((char, index) => {
    width += ctx.measureText(char).width;
    if (index < chars.length - 1) width += letterSpacing;
  });
  if (width > maxWidth) {
    ctx.fillText(text, centerX, y, maxWidth);
    return;
  }
  let x = centerX - width / 2;
  chars.forEach((char, index) => {
    ctx.fillText(char, x, y);
    x += ctx.measureText(char).width + (index < chars.length - 1 ? letterSpacing : 0);
  });
}

function drawTitleWithFlag(ctx, opponentFlag, y) {
  const left = "BEAT THE";
  const right = "GOALIE";
  const fontSize = 64;
  const gap = 22;
  const flagWidth = 88;
  const flagHeight = 56;
  setMainFont(ctx, fontSize, 700);
  const leftWidth = ctx.measureText(left).width;
  const rightWidth = ctx.measureText(right).width;
  const totalWidth = leftWidth + gap + flagWidth + gap + rightWidth;
  const startX = (EXPORT_SIZE - totalWidth) / 2;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = IVORY;
  ctx.shadowColor = "rgba(0,0,0,0.30)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 4;
  ctx.fillText(left, startX, y);
  ctx.fillText(right, startX + leftWidth + gap + flagWidth + gap, y);
  ctx.restore();

  drawFlag(ctx, opponentFlag, startX + leftWidth + gap, y - flagHeight / 2, flagWidth, flagHeight);
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    const finish = (blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The challenge share image could not be created"));
    };

    if (canvas.toBlob) {
      canvas.toBlob(finish, "image/png");
      return;
    }

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const [header, base64] = dataUrl.split(",");
      const mime = /^data:([^;]+);base64$/.exec(header)?.[1] || "image/png";
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      finish(new Blob([bytes], { type: mime }));
    } catch (error) {
      reject(error);
    }
  });
}

export async function createChallengeShareBlob({
  score = 0,
  rank = null,
  username = "GUEST",
  userTeam = null,
  opponentTeam = CAPE_VERDE_FALLBACK,
} = {}) {
  if (typeof document === "undefined") throw new Error("Challenge share export needs a browser canvas");
  await ensureFontsReady();

  const safeUserTeam = normaliseTeam(userTeam, { name: "Team", code: "TMR" });
  const safeOpponent = normaliseTeam(opponentTeam, CAPE_VERDE_FALLBACK);
  const displayScore = safeScore(score);
  const displayRank = safeRank(rank);
  const displayUsername = cleanUpper(username, "GUEST");

  const [mondayLogo, userFlag, opponentFlag] = await Promise.all([
    loadCanvasImage(ASSETS.branding.mondayLogo),
    loadCanvasImage(safeUserTeam.flag),
    loadCanvasImage(safeOpponent.flag),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  try {
    drawMowedBackground(ctx, EXPORT_SIZE, EXPORT_SIZE);

    drawImageContain(ctx, mondayLogo, EXPORT_SIZE * 0.5, 135, 145, 145);
    drawTitleWithFlag(ctx, opponentFlag, 290);
    drawDecorLine(ctx, 290, 250, 405);
    drawDecorLine(ctx, 290, 1195, 1350);

    drawHeroResultLine(ctx, displayScore, 505);
    drawImpactText(ctx, cleanUpper(safeOpponent.name, "CAPE VERDE"), EXPORT_SIZE * 0.5, 652, {
      size: 122,
      minSize: 68,
      maxWidth: EXPORT_SIZE * 0.78,
      colour: IVORY,
      strokeWidth: 2,
      shadowDepth: 14,
    });
    drawSpark(ctx, 205, 640, 21);
    drawSpark(ctx, 1395, 640, 21);

    const cardX = 160;
    const cardY = 840;
    const cardW = EXPORT_SIZE - cardX * 2;
    const cardH = 340;

    ctx.save();
    roundedRect(ctx, cardX, cardY, cardW, cardH, 40);
    const cardFill = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    cardFill.addColorStop(0, "rgba(3,27,18,0.74)");
    cardFill.addColorStop(1, "rgba(1,18,12,0.60)");
    ctx.fillStyle = cardFill;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(247,209,23,0.90)";
    ctx.stroke();
    ctx.restore();

    const tabW = 420;
    const tabH = 78;
    const tabX = EXPORT_SIZE * 0.5 - tabW / 2;
    const tabY = cardY - 48;
    ctx.save();
    roundedRect(ctx, tabX, tabY, tabW, tabH, 28);
    ctx.fillStyle = "rgba(8,74,43,0.96)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(247,209,23,0.86)";
    ctx.stroke();
    ctx.restore();
    drawCenteredText(ctx, "MY RESULT", EXPORT_SIZE * 0.5, tabY + tabH / 2, {
      size: 46,
      minSize: 34,
      maxWidth: tabW * 0.82,
      colour: IVORY,
      weight: 700,
      letterSpacing: 1,
      shadow: false,
    });

    const innerLeft = cardX + 70;
    const innerRight = cardX + cardW - 70;
    const innerW = innerRight - innerLeft;
    const cols = {
      rank: innerLeft + innerW * 0.10,
      player: innerLeft + innerW * 0.38,
      team: innerLeft + innerW * 0.68,
      score: innerLeft + innerW * 0.91,
    };
    const headerY = cardY + 92;
    const valueY = cardY + 225;

    [
      innerLeft + innerW * 0.23,
      innerLeft + innerW * 0.53,
      innerLeft + innerW * 0.80,
    ].forEach((x) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, cardY + 92);
      ctx.lineTo(x, cardY + cardH - 70);
      ctx.strokeStyle = "rgba(247,209,23,0.58)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });

    const headerStyle = {
      size: 32,
      minSize: 24,
      colour: "rgba(245,241,232,0.76)",
      weight: 700,
      maxWidth: 180,
      letterSpacing: 1,
      shadow: false,
    };
    drawCenteredText(ctx, "RANK", cols.rank, headerY, headerStyle);
    drawCenteredText(ctx, "PLAYER", cols.player, headerY, headerStyle);
    drawCenteredText(ctx, "TEAM", cols.team, headerY, headerStyle);
    drawCenteredText(ctx, "SCORE", cols.score, headerY, headerStyle);

    drawImpactText(ctx, displayRank ? `#${displayRank}` : "#--", cols.rank, valueY, {
      size: 82,
      minSize: 48,
      maxWidth: 180,
      colour: LED_YELLOW,
      strokeWidth: 1,
      shadowDepth: 8,
    });
    drawImpactText(ctx, displayUsername, cols.player, valueY, {
      size: 72,
      minSize: 38,
      maxWidth: 360,
      colour: IVORY,
      strokeWidth: 1,
      shadowDepth: 8,
    });
    drawFlag(ctx, userFlag, cols.team - 72, valueY - 45, 144, 90);
    drawImpactText(ctx, String(displayScore), cols.score, valueY - 2, {
      size: 104,
      minSize: 58,
      maxWidth: 150,
      colour: LED_YELLOW,
      strokeWidth: 1,
      shadowDepth: 10,
    });

    drawDecorLine(ctx, 1446, 470, 610);
    drawDecorLine(ctx, 1446, 990, 1130);
    drawImpactText(ctx, "MONDAYCUP.CO.UK", EXPORT_SIZE * 0.5, 1448, {
      size: 62,
      minSize: 42,
      maxWidth: EXPORT_SIZE * 0.7,
      colour: IVORY,
      strokeWidth: 1,
      shadowDepth: 7,
    });

    return await canvasToBlob(canvas);
  } finally {
    releaseLoadedImages([mondayLogo, userFlag, opponentFlag]);
  }
}
