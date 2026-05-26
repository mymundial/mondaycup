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
const TERMINAL_STATUSES = new Set(["eliminated", "champion", "runnerUp", "third", "fourth"]);

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

async function composeShareExportCanvas(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_EXPORT_SIZE;
  canvas.height = SHARE_EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const bannerHeight = SHARE_TOP_BANNER_HEIGHT;

  const topGradient = ctx.createLinearGradient(0, 0, 0, bannerHeight);
  topGradient.addColorStop(0, "#0A3C27");
  topGradient.addColorStop(0.5, "#072D1D");
  topGradient.addColorStop(1, "#051F15");
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, SHARE_EXPORT_SIZE, bannerHeight);

  // Keep the top export banner clean: no internal grid/vertical join lines.

  ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, bannerHeight, SHARE_EXPORT_SIZE, SHARE_EXPORT_SIZE);

  const [cornerLogo, adLogo] = await Promise.all([
    loadCanvasImage(await assetToDataUrl(ASSETS.mondayLogo)),
    loadCanvasImage(await assetToDataUrl("/monday-cup-ad.png")),
  ]);

  const cornerLogoSize = bannerHeight * 0.68;
  const cornerInsetX = SHARE_EXPORT_SIZE * 0.09;
  drawImageContain(ctx, cornerLogo, cornerInsetX - cornerLogoSize / 2, bannerHeight * 0.14, cornerLogoSize, bannerHeight * 0.72);
  drawImageContain(ctx, cornerLogo, SHARE_EXPORT_SIZE - cornerInsetX - cornerLogoSize / 2, bannerHeight * 0.14, cornerLogoSize, bannerHeight * 0.72);

  const adLogoWidth = SHARE_EXPORT_SIZE * 0.18;
  const adLogoHeight = bannerHeight * 0.62;
  drawImageContain(ctx, adLogo, (SHARE_EXPORT_SIZE - adLogoWidth) / 2, (bannerHeight - adLogoHeight) / 2, adLogoWidth, adLogoHeight);

  ctx.strokeStyle = "rgba(245,241,232,0.42)";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, SHARE_EXPORT_SIZE - 6, SHARE_EXPORT_SIZE - 6);

  ctx.strokeStyle = "rgba(245,241,232,0.24)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, bannerHeight);
  ctx.lineTo(SHARE_EXPORT_SIZE, bannerHeight);
  ctx.stroke();

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

async function renderElementToCanvasWithSvg(shareElement) {
  const rect = shareElement.getBoundingClientRect();
  const cropSize = Math.max(1, Math.min(rect.width, rect.height || rect.width));
  const clone = shareElement.cloneNode(true);

  copyComputedStyles(shareElement, clone);
  await inlineCloneImages(clone);

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
    return composeShareExportCanvas(sourceCanvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function captureShareElementBlob(shareElement) {
  if (!shareElement) throw new Error("Share capture area was not found");
  if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
  await preloadImagesInElement(shareElement);
  const canvas = await renderElementToCanvasWithSvg(shareElement);
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
            <span className={`flex h-full items-center justify-center text-[inherit] home-copy-bold leading-none ${isUser ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{isQualified ? "Q" : ""}</span>
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

function FullTimeModal({ result, onNext, onDismiss, onViewBracket, onPlayAgain, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel, userForm, shareCaptureRef }) {
  const isKnockout = !result.week;
  const userInKnockout = result.home === userTeam || result.away === userTeam;
  const homeIsUser = result.home === userTeam;
  const awayIsUser = result.away === userTeam;
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);
  const [shareBlob, setShareBlob] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState("");
  const isTerminalResult = TERMINAL_STATUSES.has(result?.status);
  const campaignPointsTotal = getCampaignPointsTotal({ result, groupRows, userTeam, userForm });

  const buildShareBlob = () => captureShareElementBlob(shareCaptureRef?.current);

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
          <div className="absolute left-0 right-0 top-[-50px] z-[3] grid grid-cols-[minmax(0,1fr)_78px] gap-2 px-5">
            <div className="relative flex h-11 items-center justify-center overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#072D1D] px-4 shadow-[0_6px_14px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.07),inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-[#0B5F35]/35">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.18),rgba(24,166,83,0.05),rgba(11,95,53,0.18))]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.15))]" />
              <div className="relative z-[1]"><FormTracker form={userForm} /></div>
            </div>
            <div className="relative flex h-11 flex-col items-center justify-center overflow-hidden rounded-full border border-[#F5F1E8]/18 bg-[#072D1D] px-2 shadow-[0_6px_14px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.07),inset_0_-1px_0_rgba(0,0,0,0.12)] ring-1 ring-[#0B5F35]/35">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.15))]" />
              <span className="relative z-[1] home-copy-light text-[7px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]/70">PTS</span>
              <span className="relative z-[1] font-led text-[16px] leading-none text-[#F7D117] led-text-glow">{campaignPointsTotal}</span>
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
            <div className="text-center home-copy-bold text-[25px] uppercase leading-[0.95] tracking-[0.06em] text-[#F5F0E6]">{sharePreviewOpen ? "SHARE" : modalHeaderTitle({ isKnockout, stageLabel, selectedGroup })}</div>
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
                <div className="mx-auto aspect-square w-full overflow-hidden rounded-[1.15rem] border border-[#F5F1E8]/22 bg-[#072D1D] p-[3px] shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/45">
                  <div className="relative h-full w-full overflow-hidden rounded-[0.95rem] bg-[#0B5F35]">
                    {sharePreviewUrl ? (
                      <img src={sharePreviewUrl} alt="Monday Cup result preview" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6 text-center home-copy-bold text-[13px] uppercase tracking-[0.14em] text-[#F5F1E8]">Preparing preview</div>
                    )}
                    <div className="pointer-events-none absolute inset-0 rounded-[0.95rem] ring-1 ring-[#F5F1E8]/16" aria-hidden="true" />
                  </div>
                </div>
                <button type="button" onClick={handleShare} disabled={shareBusy} className="mx-auto flex h-11 w-full items-center justify-center rounded-full border border-[#F7D117]/75 bg-[#F7D117] home-copy-bold text-[15px] uppercase tracking-[0.14em] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)] disabled:opacity-70">
                  {shareBusy ? "PREPARING" : "EXPORT"}
                </button>
              </div>
            ) : (
              <div className="mt-2.5 space-y-2">
                <button type="button" onClick={openSharePreview} disabled={shareBusy} className="mx-auto flex h-11 w-full items-center justify-center rounded-full border border-[#F7D117]/75 bg-[#F7D117] home-copy-bold text-[15px] uppercase tracking-[0.14em] text-[#072D1D] shadow-[0_0_14px_rgba(247,209,23,0.24),inset_0_2px_8px_rgba(255,255,255,0.22)] disabled:opacity-70">
                  {shareBusy ? "PREPARING" : "SHARE YOUR RESULT"}
                </button>

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
  const isTerminalResult = TERMINAL_STATUSES.has(matchResult?.status);
  const userTeam = teamToGameTeam(team || "Team A");
  const opponentTeam = teamToGameTeam(opponent || "Team B");
  const fallbackFixture = fixture || createFallbackFixture({ team, opponent });
  const completedResult = toCompletedGameResult(matchResult, fallbackFixture);
  const showChampionsBadge = matchResult?.status === "champion" || podium?.champion === team;

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
          />
        </div>

        {matchResult && !modalDismissed && (
          <FullTimeModal
            result={matchResult}
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
          />
        )}

      </div>
    </Shell>
  );
}
