import { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "../../data/assets.js";
import { auth } from "../../firebase.js";
import { Flag, HamburgerIcon } from "../shared.jsx";
import { Shell } from "../layout/Layout.jsx";
import { MenuDropdown } from "../layout/Menu.jsx";
import FootballGame from "./FootballGame.jsx";
import {
  createFallbackFixture,
  modalButton,
  modalHeaderTitle,
  teamToGameTeam,
  toCompletedGameResult,
} from "../../logic/matchPresentation.js";

const SHARE_CANVAS_NAME = "monday-cup-result.png";
const SHARE_EXPORT_SIZE = 2000;
const SHARE_TOP_BANNER_HEIGHT = 90;
const CHAMPIONS_BADGE_SRC = "/mc-champs2.png";
const RUNNER_UP_BADGE_SRC = "/mc-runner-up.png";
const THIRD_PLACE_BADGE_SRC = "/mc-third-place.png";
const TERMINAL_STATUSES = new Set(["eliminated", "champion", "runnerUp", "runner-up", "fourth"]);
const THIRD_PLACE_STATUSES = new Set(["third", "thirdPlace", "third-place", "bronze"]);

const SHARE_TEAM_BORDER_COLORS = {
  Mexico: "#29A64A",
  Canada: "#E32219",
  USA: "#2430D9",
  England: "#F5F1E8",
  France: "#1454A8",
  Spain: "#F7D117",
  Argentina: "#78BCE8",
  Brazil: "#F7D117",
  Germany: "#F5F1E8",
  Portugal: "#0B7A3B",
  Italy: "#0B7A3B",
  Netherlands: "#FF6A13",
};

const SHARE_TEAM_EXPORT_STYLES = {
  Mexico: { bg: "#29A64A", fg: "#072D1D" },
  Canada: { bg: "#E32219", fg: "#F5F1E8" },
  USA: { bg: "#2430D9", fg: "#F5F1E8" },
  England: { bg: "#F5F1E8", fg: "#072D1D" },
  France: { bg: "#1454A8", fg: "#F5F1E8" },
  Spain: { bg: "#F7D117", fg: "#072D1D" },
  Argentina: { bg: "#78BCE8", fg: "#072D1D" },
  Brazil: { bg: "#F7D117", fg: "#072D1D" },
  Germany: { bg: "#F5F1E8", fg: "#072D1D" },
  Portugal: { bg: "#0B7A3B", fg: "#F5F1E8" },
  Italy: { bg: "#0B7A3B", fg: "#F5F1E8" },
  Netherlands: { bg: "#FF6A13", fg: "#072D1D" },
};

function getShareBorderColor(team) {
  return SHARE_TEAM_BORDER_COLORS[team] || "#F7D117";
}

function getShareExportTeamStyle(team) {
  return SHARE_TEAM_EXPORT_STYLES[team] || { bg: getShareBorderColor(team), fg: "#072D1D" };
}

function applySharePreviewOverrides(clone, userTeam = null, badgeMode = null) {
  if (!clone) return;

  clone.querySelectorAll('[data-normalise-stage-label="true"]').forEach((node) => {
    node.textContent = normaliseThirdPlaceCopy(node.textContent);
  });

  // The live match page keeps the flash commentary beneath the scoreboard.
  // The export composition moves it above the scoreboard text only in the cloned share card.
  const scoreboardInner = clone.querySelector('[data-share-scoreboard="true"] > div.relative');
  const flash = clone.querySelector('[data-share-flash="true"]');
  const divider = clone.querySelector('[data-share-score-divider="true"]');
  if (divider) divider.remove();
  if (scoreboardInner && flash) {
    scoreboardInner.insertBefore(flash, scoreboardInner.firstElementChild);
    flash.style.margin = "0";
    flash.style.borderTopWidth = "0px";
    flash.style.boxShadow = "inset 0 -1px 0 rgba(245,241,232,0.18)";
  }

  if (badgeMode === "runnerUp" && flash) {
    const teamStyle = getShareExportTeamStyle(userTeam);
    flash.textContent = `${String(userTeam || "YOUR TEAM").toUpperCase()} LOST!`;
    flash.style.background = teamStyle.bg;
    flash.style.color = teamStyle.fg;
  }
}

function normaliseThirdPlaceCopy(value) {
  return String(value || "").replace(/3rd\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF").replace(/third\s*place\s*playoff/gi, "THIRD PLACE PLAY-OFF").replace(/third\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF");
}

function textIncludesThirdPlace(value) {
  return /third\s*place|3rd\s*place|bronze|m103|third[-_\s]*place[-_\s]*play[-_\s]*off|third[-_\s]*place[-_\s]*playoff/i.test(String(value || ""));
}

function isThirdPlacePlayoffResult({ result, fixture, stageLabel }) {
  const status = result?.status;
  if (!THIRD_PLACE_STATUSES.has(status)) return false;
  const values = [
    stageLabel,
    fixture?.id,
    fixture?.code,
    fixture?.name,
    fixture?.title,
    fixture?.label,
    fixture?.round,
    fixture?.roundName,
    fixture?.stage,
    fixture?.stageName,
    fixture?.phase,
    fixture?.type,
    fixture?.matchType,
    fixture?.matchNo,
    result?.id,
    result?.code,
    result?.name,
    result?.title,
    result?.label,
    result?.round,
    result?.roundName,
    result?.stage,
    result?.stageName,
    result?.phase,
    result?.type,
    result?.matchType,
    result?.matchNo,
  ];
  return values.some(textIncludesThirdPlace);
}

function getTerminalBadgeMode({ result, fixture, stageLabel, podium, team }) {
  if (!result) return null;
  if (result.status === "champion" || podium?.champion === team) return "champion";
  if (result.status === "runnerUp" || result.status === "runner-up" || podium?.runnerUp === team || podium?.runnerup === team || podium?.second === team) return "runnerUp";
  if (isThirdPlacePlayoffResult({ result, fixture, stageLabel }) || (podium?.third === team && isThirdPlacePlayoffResult({ result, fixture, stageLabel })) || (podium?.thirdPlace === team && isThirdPlacePlayoffResult({ result, fixture, stageLabel }))) return "third";
  return null;
}

function isTerminalShareResult({ result, fixture, stageLabel, podium, team }) {
  if (!result) return false;
  if (getTerminalBadgeMode({ result, fixture, stageLabel, podium, team })) return true;
  if (THIRD_PLACE_STATUSES.has(result.status)) return isThirdPlacePlayoffResult({ result, fixture, stageLabel });
  return TERMINAL_STATUSES.has(result.status);
}

function getBadgeMode({ status, podium, team }) {
  if (status === "champion" || podium?.champion === team) return "champion";
  if (status === "runnerUp" || status === "runner-up" || podium?.runnerUp === team || podium?.runnerup === team || podium?.second === team) return "runnerUp";
  // Third place must be gated by fixture context via getTerminalBadgeMode so it is not awarded after a semi-final.
  return null;
}

function getBadgeVisuals(mode) {
  if (mode === "runnerUp") {
    return {
      src: RUNNER_UP_BADGE_SRC,
      alt: "Monday Cup Runner-Up",
      glowOuter: "rgba(235,238,243,0.26)",
      glowInner: "rgba(255,255,255,0.22)",
      shadow: "drop-shadow(0 0 18px rgba(235,238,243,0.42))",
    };
  }
  if (mode === "third") {
    return {
      src: THIRD_PLACE_BADGE_SRC,
      alt: "Monday Cup Third Place",
      glowOuter: "rgba(205,127,50,0.25)",
      glowInner: "rgba(244,176,104,0.11)",
      shadow: "drop-shadow(0 0 18px rgba(205,127,50,0.46))",
    };
  }
  if (mode === "champion") {
    return {
      src: CHAMPIONS_BADGE_SRC,
      alt: "Monday Cup Champions",
      glowOuter: "rgba(247,209,23,0.25)",
      glowInner: "rgba(247,209,23,0.11)",
      shadow: "drop-shadow(0 0 18px rgba(247,209,23,0.46))",
    };
  }
  return null;
}

function getDisplayUsername() {
  const currentUser = auth.currentUser;
  return currentUser?.displayName || currentUser?.email?.split("@")[0] || "";
}

async function preloadImagesInElement(element) {
  const images = Array.from(element?.querySelectorAll?.("img") || []);
  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    if (img.decode) return img.decode().catch(() => null);
    return new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }));
}


async function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load share image asset: ${src}`));
    img.src = src;
  });
}

function drawImageContain(ctx, img, x, y, width, height) {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if (imageRatio > targetRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

async function composeShareExportCanvas(sourceCanvas, userTeam = null, badgeMode = null) {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_EXPORT_SIZE;
  canvas.height = SHARE_EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, SHARE_EXPORT_SIZE, SHARE_EXPORT_SIZE);

  // Export should use the live-rendered match scene exactly as captured.
  // No extra badge, glow, scoreboard darkening, flash gradient, or stadium vignette is applied here.
  ctx.strokeStyle = getShareBorderColor(userTeam);
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, SHARE_EXPORT_SIZE - 20, SHARE_EXPORT_SIZE - 20);

  return canvas;
}

function getCanvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The share image could not be created"));
    }, "image/png", 0.95);
  });
}

function copyComputedStyles(source, target) {
  if (!(source instanceof Element) || !(target instanceof Element)) return;
  const computed = window.getComputedStyle(source);
  for (const property of computed) {
    target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
  }
  target.style.setProperty("animation", "none", "important");
  target.style.setProperty("transition", "none", "important");

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, index) => copyComputedStyles(child, targetChildren[index]));
}

async function imageToDataUrl(src) {
  try {
    const absolute = new URL(src, window.location.href);
    if (absolute.origin !== window.location.origin) return src;
    const response = await fetch(absolute.href, { cache: "force-cache" });
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || src);
      reader.onerror = () => resolve(src);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

async function assetToDataUrl(src) {
  try {
    const absolute = new URL(src, window.location.href);
    const response = await fetch(absolute.href, { cache: "force-cache" });
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result || absolute.href);
      reader.onerror = () => resolve(absolute.href);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

async function buildEmbeddedFontCss() {
  const [led, regular, bold, light] = await Promise.all([
    assetToDataUrl("/fonts/intodotmatrix-webfont.woff2"),
    assetToDataUrl("/fonts/sumpfdeutschensportschriftsdin-regular-webfont.woff2"),
    assetToDataUrl("/fonts/sumpfdeutschensportschriftsdin-bold-webfont.woff2"),
    assetToDataUrl("/fonts/sumpfdeutschensportschriftsdin-light-webfont.woff2"),
  ]);

  return `
    @font-face { font-family: "IntoDotMatrix"; src: url("${led}") format("woff2"); font-weight: 400; font-style: normal; }
    @font-face { font-family: "SportsDINRegular"; src: url("${regular}") format("woff2"); font-weight: 400; font-style: normal; }
    @font-face { font-family: "SportsDINBold"; src: url("${bold}") format("woff2"); font-weight: 700; font-style: normal; }
    @font-face { font-family: "SportsDINLight"; src: url("${light}") format("woff2"); font-weight: 300; font-style: normal; }
    .font-led { font-family: "IntoDotMatrix", monospace !important; }
    .home-copy-bold, .font-main-bold { font-family: "SportsDINBold", "SportsDINRegular", sans-serif !important; }
    .home-copy-regular, .home-main-font, .font-main { font-family: "SportsDINRegular", sans-serif !important; }
    .home-copy-light, .font-main-light { font-family: "SportsDINLight", "SportsDINRegular", sans-serif !important; }
  `;
}

async function inlineCloneImages(clone) {
  const images = Array.from(clone.querySelectorAll("img"));
  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) return;
    img.setAttribute("src", await imageToDataUrl(src));
    img.setAttribute("crossorigin", "anonymous");
  }));
}

async function renderElementToCanvasWithSvg(shareElement, userTeam = null, badgeMode = null) {
  const rect = shareElement.getBoundingClientRect();
  const cropSize = Math.max(1, Math.min(rect.width, rect.height || rect.width));
  const clone = shareElement.cloneNode(true);

  copyComputedStyles(shareElement, clone);
  await inlineCloneImages(clone);
  applySharePreviewOverrides(clone, userTeam, badgeMode);

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.margin = "0";
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.minWidth = `${rect.width}px`;
  clone.style.minHeight = `${rect.height}px`;
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";
  clone.style.overflow = "hidden";
  clone.style.transform = "none";

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  const fontStyle = document.createElement("style");
  fontStyle.textContent = await buildEmbeddedFontCss();
  wrapper.appendChild(fontStyle);
  wrapper.style.width = `${cropSize}px`;
  wrapper.style.height = `${cropSize}px`;
  wrapper.style.overflow = "hidden";
  wrapper.style.position = "relative";
  wrapper.style.background = window.getComputedStyle(shareElement).backgroundColor || "#0d6c3d";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${cropSize}" height="${cropSize}" viewBox="0 0 ${cropSize} ${cropSize}">
      <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
    </svg>`;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("The screenshot image could not be rendered"));
      img.src = url;
    });

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = SHARE_EXPORT_SIZE;
    sourceCanvas.height = SHARE_EXPORT_SIZE;
    const ctx = sourceCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, SHARE_EXPORT_SIZE, SHARE_EXPORT_SIZE);
    return composeShareExportCanvas(sourceCanvas, userTeam, badgeMode);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function captureShareElementBlob(shareElement, userTeam = null, badgeMode = null) {
  if (!shareElement) throw new Error("Share capture area was not found");
  if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
  await preloadImagesInElement(shareElement);
  const canvas = await renderElementToCanvasWithSvg(shareElement, userTeam, badgeMode);
  return getCanvasBlob(canvas);
}

async function shareOrDownloadResult({ blob, buildBlob, filename = SHARE_CANVAS_NAME }) {
  const finalBlob = blob || await buildBlob?.();
  if (!finalBlob) throw new Error("No share image could be created");
  const file = new File([finalBlob], filename, { type: "image/png" });

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try {
      await navigator.share({ files: [file], title: "Monday Cup Result", text: "My Monday Cup result" });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("Native share failed, downloading instead", error);
    }
  }

  const url = URL.createObjectURL(finalBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadBlob(blob, filename = SHARE_CANVAS_NAME) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function CloseIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

function BackArrowIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.5 4.75L8.25 12l7.25 7.25" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BracketIcon({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="7" y="10" width="16" height="13" rx="2.5" stroke="currentColor" strokeWidth="4" />
      <rect x="7" y="41" width="16" height="13" rx="2.5" stroke="currentColor" strokeWidth="4" />
      <rect x="41" y="25.5" width="16" height="13" rx="2.5" stroke="currentColor" strokeWidth="4" />
      <path d="M23 16.5h8c5 0 7 3.5 10 9M23 47.5h8c5 0 7-3.5 10-9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FootballLineIcon({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="25" stroke="currentColor" strokeWidth="4" />
      <path d="M32 18l11 8-4 13H25l-4-13 11-8Z" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M21 26l-10-4M43 26l10-4M25 39l-7 10M39 39l7 10M32 18V7M32 57v-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ShareResultIcon({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M21 36v15h30V36" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M36 12v29M36 12l-10 10M36 12l10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 30h12M39 51H13V30" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
    </svg>
  );
}

function TerminalActionCard({ onClick, icon, label, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex aspect-square min-h-[92px] flex-col items-center justify-center gap-2 rounded-[1.2rem] border border-[#F7D117]/75 bg-[#F7D117] px-2 text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.22),inset_0_2px_8px_rgba(255,255,255,0.22)] ring-1 ring-[#F7D117]/35 disabled:opacity-70"
    >
      <span className="flex h-9 items-center justify-center text-[#072D1D]">{icon}</span>
      <span className="home-copy-bold text-[9px] uppercase leading-none tracking-[0.08em]">{label}</span>
    </button>
  );
}


function getCampaignPointsTotal({ result, groupRows = [], userTeam = null, userForm = [] }) {
  const directValue = result?.campaignPoints ?? result?.pointsTotal ?? result?.leaderboardPoints ?? result?.totalPoints;
  if (Number.isFinite(Number(directValue))) return Number(directValue);

  const userRow = groupRows.find((row) => row.team === userTeam);
  const tablePoints = Number(userRow?.pts || 0);
  const formBonus = userForm.reduce((total, item) => {
    if (item === "W") return total + 3;
    if (item === "D") return total + 1;
    return total;
  }, 0);

  if (tablePoints || formBonus) return Math.max(tablePoints, formBonus);
  return 0;
}

function FormTracker({ form = [] }) {
  const ledClass = (value) => {
    if (value === "W") return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.85),0_0_22px_rgba(34,197,94,0.32)]";
    if (value === "L") return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85),0_0_22px_rgba(239,68,68,0.32)]";
    if (value === "D") return "bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.9),0_0_22px_rgba(247,209,23,0.34)]";
    return "bg-[#F7D117]/28 shadow-[0_0_6px_rgba(247,209,23,0.25)]";
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} className={`h-5 w-5 rounded-full ${ledClass(form[index])}`} />
      ))}
    </div>
  );
}

function StandingsMiniTable({ rows = [], qualifiedTeams = new Set(), userTeam = null }) {
  if (!rows.length) return null;

  const tableColumns = "20px 28px minmax(0, 1fr) 14px 18px 18px 18px 18px 20px 24px";
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);

  return (
    <div className="mt-0 overflow-visible">
      <div className="grid gap-[3px] px-2 pb-[2px] text-center text-[9px] home-copy-regular uppercase tracking-[0.08em] text-[#F5F1E8]" style={{ gridTemplateColumns: tableColumns }}>
        <span>#</span><span className="text-center">Team</span><span aria-hidden="true" /><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isUser = row.team === userTeam;
        const isQualified = qualifiedTeams.has(row.team);
        return (
          <div key={row.team} className={`mb-1 grid items-center gap-[3px] rounded-xl border px-2 py-[5px] text-center text-[12px] leading-none last:mb-0 ring-1 ${isUser ? "border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] ring-[#0B5F35]/45 shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`} style={{ gridTemplateColumns: tableColumns }}>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{index + 1}</span>
            <span className="flex justify-center"><Flag team={row.team} className="h-4 w-6 rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></span>
            <span className={`min-w-0 truncate text-left uppercase home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#26352E]"}`} style={tightTeamStyle(row.team)}>{row.team}</span>
            <span className={`flex h-full items-center justify-center text-[12px] home-copy-bold leading-none ${isUser ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{isQualified ? "Q" : ""}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.played}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.won}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.drawn}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.lost}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.gd}</span>
            <span className={`home-copy-bold ${isUser ? "text-[#F7D117]" : ""}`}>{row.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function FullTimeModal({ result, fixture, onNext, onDismiss, onViewBracket, onPlayAgain, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel, userForm, shareCaptureRef, podium }) {
  const isKnockout = !result.week;
  const userInKnockout = result.home === userTeam || result.away === userTeam;
  const homeIsUser = result.home === userTeam;
  const awayIsUser = result.away === userTeam;
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);
  const [shareBlob, setShareBlob] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState("");
  const isTerminalResult = isTerminalShareResult({ result, fixture, stageLabel, podium, team: userTeam });
  const campaignPointsTotal = getCampaignPointsTotal({ result, groupRows, userTeam, userForm });
  const activeBadgeMode = getTerminalBadgeMode({ result, fixture, stageLabel, podium, team: userTeam });

  const buildShareBlob = () => captureShareElementBlob(shareCaptureRef?.current, userTeam, activeBadgeMode);

  useEffect(() => {
    let active = true;
    setShareBlob(null);
    setSharePreviewOpen(false);
    if (!isTerminalResult) return undefined;
    window.requestAnimationFrame(() => {
      buildShareBlob().then((blob) => {
        if (active) setShareBlob(blob);
      }).catch(() => {
        if (active) setShareBlob(null);
      });
    });
    return () => { active = false; };
  }, [isTerminalResult, result, shareCaptureRef]);

  useEffect(() => {
    if (!shareBlob) {
      setSharePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(shareBlob);
    setSharePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shareBlob]);

  const ensureShareBlob = async () => {
    if (shareBlob) return shareBlob;
    const blob = await buildShareBlob();
    setShareBlob(blob);
    return blob;
  };

  const openSharePreview = async () => {
    setSharePreviewOpen(true);
    if (shareBlob) return;
    setShareBusy(true);
    try {
      await ensureShareBlob();
    } catch (error) {
      console.error("Share preview failed", error);
      window.alert("Sorry, the result preview could not be created. Please try again.");
      setSharePreviewOpen(false);
    } finally {
      setShareBusy(false);
    }
  };

  const handleShare = async () => {
    setShareBusy(true);
    try {
      const blob = await ensureShareBlob();
      await shareOrDownloadResult({ blob });
    } catch (error) {
      console.error("Share result failed", error);
      window.alert("Sorry, the result image could not be shared. Please try again.");
    } finally {
      setShareBusy(false);
    }
  };



  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#072D1D]/48 px-5 pt-20">
      <div className="relative w-full max-w-sm overflow-visible rounded-[2rem] border border-[#F5F1E8]/14 bg-[#0B5F35]/92 text-center text-[#F5F1E8] shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_-2px_6px_rgba(0,0,0,0.06)]">
        {!sharePreviewOpen && (
          <div className="absolute left-0 right-0 top-[-62px] z-[3] grid grid-cols-[minmax(0,1fr)_78px] gap-4 px-5">
            <div className="relative flex h-11 items-center justify-center overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#072D1D] px-4 shadow-[0_6px_14px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.07),inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-[#0B5F35]/35">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.18),rgba(24,166,83,0.05),rgba(11,95,53,0.18))]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.15))]" />
              <div className="relative z-[1]"><FormTracker form={userForm} /></div>
            </div>
            <div className="relative flex h-11 items-center justify-center overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#072D1D] px-2 shadow-[0_6px_14px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.07),inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-[#0B5F35]/35">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.15))]" />
              <span className="relative z-[1] font-led text-[18px] leading-none text-[#F7D117] led-text-glow">{campaignPointsTotal}</span>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-t-[2rem] bg-[#0B5F35]/0 px-5 pb-1.5 pt-2 text-[#F5F0E6]">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
            {sharePreviewOpen ? (
              <button
                type="button"
                onClick={() => setSharePreviewOpen(false)}
                aria-label="Back to result options"
                className="flex h-9 w-9 items-center justify-center justify-self-start text-[#F5F0E6]"
              >
                <BackArrowIcon className="h-7 w-7" />
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center">
                <img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain" draggable={false} />
              </div>
            )}
            <div className="text-center home-copy-bold text-[25px] uppercase leading-[0.95] tracking-[0.06em] text-[#F5F0E6]">{sharePreviewOpen ? "SHARE" : normaliseThirdPlaceCopy(modalHeaderTitle({ isKnockout, stageLabel, selectedGroup }))}</div>
            <button onClick={onDismiss} aria-label="Close result" className="flex h-9 w-9 items-center justify-center justify-self-end text-[#F5F0E6]">
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-4 pt-1.5">
          {!sharePreviewOpen && (isKnockout ? (
            <>
              <div className={`mt-1 rounded-[1.25rem] px-2.5 py-3 ${userInKnockout ? "border border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#0B5F35]/45 shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "bg-[#F5F1E8]/90 text-[#26352E] ring-1 ring-[#F5F1E8]/10"}`}>
                <div className={`grid min-h-[32px] grid-cols-[28px_minmax(0,1fr)_34px_minmax(0,1fr)_28px] items-center gap-1 home-main-font text-[clamp(13px,3.4vw,15px)] uppercase leading-none ${userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`}>
                  <div className="flex items-center justify-center"><Flag team={result.home} className="h-5 w-7 rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></div>
                  <span className={`block min-w-0 truncate text-center home-copy-regular ${homeIsUser ? "text-[#F7D117]" : userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`} style={tightTeamStyle(result.home)} title={result.home}>{result.home}</span>
                  <span className={`flex items-center justify-center home-copy-bold tabular-nums leading-none ${userInKnockout ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{result.homeGoals}-{result.awayGoals}</span>
                  <span className={`block min-w-0 truncate text-center home-copy-regular ${awayIsUser ? "text-[#F7D117]" : userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`} style={tightTeamStyle(result.away)} title={result.away}>{result.away}</span>
                  <div className="flex items-center justify-center"><Flag team={result.away} className="h-5 w-7 rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <StandingsMiniTable rows={groupRows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />
            </>
          ))}

          {isTerminalResult ? (
            sharePreviewOpen ? (
              <div className="mt-1.5 space-y-2.5">
                <div className="mx-auto aspect-square w-full overflow-hidden border border-[#F5F1E8]/22 bg-[#072D1D] p-[3px] shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/45">
                  <div className="relative h-full w-full overflow-hidden bg-[#0B5F35]">
                    {sharePreviewUrl ? (
                      <img src={sharePreviewUrl} alt="Monday Cup result preview" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6 text-center home-copy-bold text-[13px] uppercase tracking-[0.14em] text-[#F5F1E8]">Preparing preview</div>
                    )}
                    <div className="pointer-events-none absolute inset-0 ring-1 ring-[#F5F1E8]/16" aria-hidden="true" />
                  </div>
                </div>
                <button type="button" onClick={handleShare} disabled={shareBusy} className="mx-auto flex h-11 w-full items-center justify-center rounded-full border border-[#F7D117]/75 bg-[#F7D117] home-copy-bold text-[15px] uppercase tracking-[0.14em] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)] disabled:opacity-70">
                  {shareBusy ? "PREPARING" : "EXPORT"}
                </button>
              </div>
            ) : (
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <TerminalActionCard onClick={onViewBracket} label="VIEW BRACKET" icon={<BracketIcon className="h-8 w-8" />} />
                <TerminalActionCard onClick={onPlayAgain} label="PLAY AGAIN" icon={<FootballLineIcon className="h-8 w-8" />} />
                <TerminalActionCard onClick={openSharePreview} disabled={shareBusy} label={shareBusy ? "PREPARING" : "SHARE RESULT"} icon={<ShareResultIcon className="h-8 w-8" />} />
              </div>
            )
          ) : (
            <button onClick={onNext} className="mx-auto mt-2.5 flex h-10 w-full items-center justify-center rounded-full border border-[#F7D117]/75 bg-[#F7D117] home-copy-bold text-[15px] uppercase tracking-[0.14em] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)]">{modalButton(result)}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MatchScreen({
  team,
  opponent,
  score,
  matchResult,
  modalDismissed = false,
  onDismissModal,
  onQuickWin,
  onMatchComplete,
  onNextMatch,
  onViewBracket,
  onPlayAgain,
  menuProps,
  stageLabel = "GROUP STAGE",
  fixture,
  groupRows = [],
  qualifiedTeams = new Set(),
  selectedGroup = "A",
  userForm = [],
  campaignId = "default",
  podium = null,
}) {
  const [matchBusy, setMatchBusy] = useState(false);
  const shareCaptureRef = useRef(null);
  const username = useMemo(() => getDisplayUsername(), [matchResult]);
  const isTerminalResult = isTerminalShareResult({ result: matchResult, fixture, stageLabel, podium, team });
  const userTeam = teamToGameTeam(team || "Team A");
  const opponentTeam = teamToGameTeam(opponent || "Team B");
  const fallbackFixture = fixture || createFallbackFixture({ team, opponent });
  const completedResult = toCompletedGameResult(matchResult, fallbackFixture);
  const activeBadgeMode = getTerminalBadgeMode({ result: matchResult, fixture, stageLabel, podium, team });
  const showChampionsBadge = activeBadgeMode === "champion";

  return (
    <Shell>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#EFE7D8]">
        <div className="relative z-[3] flex h-[54px] shrink-0 items-center justify-center overflow-hidden bg-[#072D1D] px-6 text-[#F5F1E8]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
          <img src={ASSETS.mondayLogo} alt="Monday Cup" className="absolute left-3 top-1/2 z-[1] h-12 w-12 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
          <div className="relative z-[1] home-copy-bold text-[clamp(30px,7.2vw,38px)] font-black uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">MATCH</div>
          <button onClick={menuProps.onToggleMenu} disabled={matchBusy} aria-disabled={matchBusy} title={matchBusy ? "Menu available after the shot" : "Open menu"} className={`absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F1E8] ${matchBusy ? "cursor-not-allowed opacity-45" : ""}`}>
            <HamburgerIcon />
          </button>
          {menuProps.menuOpen && <MenuDropdown onClose={menuProps.onToggleMenu} onMatch={menuProps.onMatch} onFixtures={menuProps.onFixtures} onGroups={menuProps.onGroups} onRestart={menuProps.onRestart} />}
        </div>

        <div ref={shareCaptureRef} className="relative min-h-0 flex-1 overflow-hidden bg-[#0d6c3d]">
          {isTerminalResult && username && (
            <div className="pointer-events-none absolute left-1/2 top-[11.8%] z-[25] -translate-x-1/2 text-center font-led text-[clamp(9px,1.35vh,16px)] font-black uppercase tracking-[0.14em] text-[#F7D117] led-text-glow">
              {username}
            </div>
          )}
          <FootballGame
            userTeam={userTeam}
            opponentTeam={opponentTeam}
            fixture={fallbackFixture}
            campaignId={campaignId}
            onMatchComplete={onMatchComplete || onQuickWin}
            completedResult={completedResult}
            endActionLabel={matchResult && modalDismissed ? modalButton(matchResult) : "FULL TIME"}
            endActionEnabled={Boolean(matchResult && modalDismissed)}
            onEndAction={onNextMatch}
            onBusyChange={setMatchBusy}
            showChampionsBadge={showChampionsBadge}
            podiumBadgeMode={activeBadgeMode}
          />
        </div>

        {matchResult && !modalDismissed && (
          <FullTimeModal
            result={matchResult}
            fixture={fallbackFixture}
            onNext={onNextMatch}
            onDismiss={onDismissModal}
            onViewBracket={onViewBracket}
            onPlayAgain={onPlayAgain}
            groupRows={groupRows}
            qualifiedTeams={qualifiedTeams}
            userTeam={team}
            selectedGroup={selectedGroup}
            stageLabel={stageLabel}
            userForm={userForm}
            shareCaptureRef={shareCaptureRef}
            podium={podium}
          />
        )}

      </div>
    </Shell>
  );
}
