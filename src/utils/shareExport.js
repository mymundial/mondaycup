export const SHARE_CANVAS_NAME = "monday-cup-result.png";
export const SHARE_EXPORT_SIZE = 2000;

export function normaliseThirdPlaceCopy(value) {
  return String(value || "")
    .replace(/3rd\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF")
    .replace(/third\s*place\s*playoff/gi, "THIRD PLACE PLAY-OFF")
    .replace(/third\s*place\s*play[-\s]*off/gi, "THIRD PLACE PLAY-OFF");
}

async function preloadImagesInElement(element) {
  const images = Array.from(element?.querySelectorAll?.("img") || []);
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      if (img.decode) return img.decode().catch(() => null);
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    }),
  );
}

function copyComputedStyles(source, target) {
  if (!(source instanceof Element) || !(target instanceof Element)) return;
  const computed = window.getComputedStyle(source);
  for (const property of computed) {
    target.style.setProperty(
      property,
      computed.getPropertyValue(property),
      computed.getPropertyPriority(property),
    );
  }
  target.style.setProperty("animation", "none", "important");
  target.style.setProperty("transition", "none", "important");

  const sourceChildren = Array.from(source.children);
  const targetChildren = Array.from(target.children);
  sourceChildren.forEach((child, index) =>
    copyComputedStyles(child, targetChildren[index]),
  );
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
    assetToDataUrl("/fonts/intodotmatrix/intodotmatrix-webfont.woff2"),
    assetToDataUrl(
      "/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-regular-webfont.woff2",
    ),
    assetToDataUrl(
      "/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-bold-webfont.woff2",
    ),
    assetToDataUrl(
      "/fonts/sumpfdeutschensportschriftsdin/sumpfdeutschensportschriftsdin-light-webfont.woff2",
    ),
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
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src || src.startsWith("data:")) return;
      img.setAttribute("src", await imageToDataUrl(src));
      img.setAttribute("crossorigin", "anonymous");
    }),
  );
}

function sanitiseShareCaptureClone(root) {
  if (!root?.querySelectorAll) return;

  root
    .querySelectorAll('[data-share-export-ignore="true"]')
    .forEach((node) => node.remove());
  root.querySelectorAll("*").forEach((node) => {
    if (!node?.style) return;
    node.style.animation = "none";
    node.style.transition = "none";
    node.style.caretColor = "transparent";
  });
}

async function composeShareExportCanvas(sourceCanvas) {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_EXPORT_SIZE;
  canvas.height = SHARE_EXPORT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    0,
    0,
    SHARE_EXPORT_SIZE,
    SHARE_EXPORT_SIZE,
  );

  return canvas;
}

function imageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The share image could not be loaded"));
    };
    image.src = url;
  });
}

function getCanvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The share image could not be created"));
      },
      "image/png",
      0.95,
    );
  });
}

async function renderElementToCanvasWithHtml2Canvas(shareElement) {
  const html2canvasModule = await import("html2canvas");
  const html2canvas = html2canvasModule.default || html2canvasModule;
  const rect = shareElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const scale = Math.max(1, SHARE_EXPORT_SIZE / Math.max(width, height));

  const source = await html2canvas(shareElement, {
    backgroundColor:
      window.getComputedStyle(shareElement).backgroundColor || "#0d6c3d",
    width,
    height,
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    imageTimeout: 10000,
    removeContainer: true,
    ignoreElements: (node) => Boolean(node?.dataset?.shareExportIgnore),
    onclone: (clonedDocument) => {
      sanitiseShareCaptureClone(clonedDocument);
    },
  });

  return composeShareExportCanvas(source);
}

async function renderElementToCanvasWithSvg(
  shareElement,
  userTeam = null,
  badgeMode = null,
) {
  const rect = shareElement.getBoundingClientRect();
  const cropSize = Math.max(1, Math.min(rect.width, rect.height || rect.width));
  const clone = shareElement.cloneNode(true);

  copyComputedStyles(shareElement, clone);
  await inlineCloneImages(clone);
  sanitiseShareCaptureClone(clone);

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
  wrapper.style.background =
    window.getComputedStyle(shareElement).backgroundColor || "#0d6c3d";
  wrapper.appendChild(clone);

  const serialized = new XMLSerializer().serializeToString(wrapper);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_EXPORT_SIZE}" height="${SHARE_EXPORT_SIZE}" viewBox="0 0 ${cropSize} ${cropSize}">
      <foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject>
    </svg>`;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(new Error("The screenshot image could not be rendered"));
      img.src = url;
    });

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = SHARE_EXPORT_SIZE;
    sourceCanvas.height = SHARE_EXPORT_SIZE;
    const ctx = sourceCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
    return composeShareExportCanvas(sourceCanvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function captureShareElementBlobFallback(shareElement) {
  const { toBlob } = await import("html-to-image");
  const rect = shareElement.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const blob = await toBlob(shareElement, {
    cacheBust: false,
    width,
    height,
    pixelRatio: Math.max(1, SHARE_EXPORT_SIZE / Math.max(width, height)),
    backgroundColor:
      window.getComputedStyle(shareElement).backgroundColor || "#0d6c3d",
    filter: (node) => !node?.dataset?.shareExportIgnore,
    style: { animation: "none", transition: "none" },
  });
  if (!blob) throw new Error("The share image could not be created");

  const image = await imageFromBlob(blob);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = SHARE_EXPORT_SIZE;
  sourceCanvas.height = SHARE_EXPORT_SIZE;
  const ctx = sourceCanvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, SHARE_EXPORT_SIZE, SHARE_EXPORT_SIZE);
  const canvas = await composeShareExportCanvas(sourceCanvas);
  return getCanvasBlob(canvas);
}

export async function captureShareElementBlob(
  shareElement,
  userTeam = null,
  badgeMode = null,
) {
  if (!shareElement) throw new Error("Share capture area was not found");
  if (document?.fonts?.ready) await document.fonts.ready.catch(() => null);
  await preloadImagesInElement(shareElement);

  const errors = [];
  const attempts = [
    // Capture the popup preview DOM as the single source of truth. The SVG path
    // runs first because it embeds same-origin images/fonts as data URLs, keeping
    // logos, badges and ad-board assets intact in the saved PNG on mobile.
    [
      "svg",
      () => renderElementToCanvasWithSvg(shareElement, userTeam, badgeMode),
    ],
    [
      "html-to-image",
      async () => {
        const blob = await captureShareElementBlobFallback(shareElement);
        return { blobOnly: blob };
      },
    ],
    ["html2canvas", () => renderElementToCanvasWithHtml2Canvas(shareElement)],
  ];

  for (const [name, attempt] of attempts) {
    try {
      const result = await attempt();
      if (result?.blobOnly) return result.blobOnly;
      return getCanvasBlob(result);
    } catch (error) {
      console.warn(`${name} share export failed`, error);
      errors.push(`${name}: ${error?.message || error}`);
    }
  }

  throw new Error(
    `The share image could not be exported. ${errors.join(" | ")}`,
  );
}

function isIOSLikeDevice() {
  const userAgent = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || "");
}

function isMobileLikeDevice() {
  return isIOSLikeDevice() || isAndroidDevice();
}

function triggerBlobDownload(blob, filename = SHARE_CANVAS_NAME) {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.position = "fixed";
    link.style.left = "-9999px";
    link.style.top = "-9999px";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch (error) {
    console.warn("Direct image download failed", error);
    return false;
  }
}

export function downloadBlobFile(blob, filename = SHARE_CANVAS_NAME) {
  if (!blob) throw new Error("No image blob was provided");
  if (!triggerBlobDownload(blob, filename))
    throw new Error("The browser blocked the download");
}

export async function shareNativeImage(
  blob,
  filename = SHARE_CANVAS_NAME,
  { title = "Monday Cup", text = "My Monday Cup shirt" } = {},
) {
  if (!blob) throw new Error("No image blob was provided");
  const file = new File([blob], filename, { type: "image/png" });
  if (!navigator.share)
    throw new Error("Native sharing is not available in this browser");
  if (navigator.canShare) {
    try {
      if (!navigator.canShare({ files: [file] }))
        throw new Error("This browser cannot share image files");
    } catch (error) {
      throw error;
    }
  }
  await navigator.share({ files: [file], title, text });
}

export function printBlobImage(blob, filename = SHARE_CANVAS_NAME) {
  if (!blob) throw new Error("No image blob was provided");
  const url = URL.createObjectURL(blob);
  const opened = window.open("", "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    throw new Error("The print window was blocked");
  }
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${filename.replace(/\.png$/i, ".pdf")}</title><style>@page{size:200mm 200mm;margin:0;}html,body{margin:0;background:#073B26;}main{min-height:100vh;display:grid;place-items:center;background:#073B26;}img{width:100vmin;height:100vmin;object-fit:contain;display:block;}@media print{html,body,main{width:100%;height:100%;background:#073B26;}img{width:100%;height:100%;}}</style></head><body><main><img src="${url}" alt="Monday Cup shirt poster" /></main><script>window.onload=()=>{setTimeout(()=>window.print(),250)}<\/script></body></html>`;
  opened.document.open();
  opened.document.write(html);
  opened.document.close();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

export function openImageSavePreview(
  blob,
  filename = SHARE_CANVAS_NAME,
  previewWindow = null,
) {
  if (!blob) throw new Error("No image blob was provided");
  if (openBlobPreview(blob, filename, previewWindow)) return true;
  if (triggerBlobDownload(blob, filename)) return true;
  throw new Error("The browser blocked the image save preview");
}

function openBlobPreview(
  blob,
  filename = SHARE_CANVAS_NAME,
  previewWindow = null,
) {
  const url = URL.createObjectURL(blob);
  const opened =
    previewWindow && !previewWindow.closed
      ? previewWindow
      : window.open("", "_blank", "noopener,noreferrer");
  if (!opened) {
    URL.revokeObjectURL(url);
    return false;
  }

  opened.document.title = filename;
  opened.document.body.style.margin = "0";
  opened.document.body.style.background = "#072D1D";
  opened.document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#072D1D;padding:14px;box-sizing:border-box;"><img src="${url}" alt="Monday Cup result" style="max-width:100%;height:auto;box-shadow:0 14px 34px rgba(0,0,0,.34);" /><a href="${url}" download="${filename}" style="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);padding:12px 16px;border-radius:14px;background:#F7D117;color:#072D1D;font-family:sans-serif;font-weight:900;text-decoration:none;letter-spacing:.08em;">SAVE IMAGE</a></main>`;
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

export function reserveShareWindow() {
  if (!isIOSLikeDevice()) return null;
  try {
    const opened = window.open("", "_blank", "noopener,noreferrer");
    if (!opened) return null;
    opened.document.title = "Preparing Monday Cup export";
    opened.document.body.style.margin = "0";
    opened.document.body.style.background = "#072D1D";
    opened.document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#072D1D;color:#F5F1E8;font-family:sans-serif;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Preparing image…</main>`;
    return opened;
  } catch {
    return null;
  }
}

export async function shareOrDownloadResult({
  blob,
  buildBlob,
  filename = SHARE_CANVAS_NAME,
  previewWindow = null,
}) {
  const finalBlob = blob || (await buildBlob?.());
  if (!finalBlob) throw new Error("No share image could be created");
  const file = new File([finalBlob], filename, { type: "image/png" });
  const shareTitle = "Monday Cup Result";
  const shareText = "My Monday Cup result";

  const canNativeFileShare = Boolean(
    navigator.share &&
    (!navigator.canShare ||
      (() => {
        try {
          return navigator.canShare({ files: [file] });
        } catch {
          return false;
        }
      })()),
  );

  if (canNativeFileShare) {
    try {
      await navigator.share({
        files: [file],
        title: shareTitle,
        text: shareText,
      });
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      return;
    } catch (error) {
      if (error?.name === "AbortError") {
        if (previewWindow && !previewWindow.closed) previewWindow.close();
        return;
      }
      console.warn(
        "Native file share failed, falling back to image save",
        error,
      );
    }
  }

  if (isIOSLikeDevice() && openBlobPreview(finalBlob, filename, previewWindow))
    return;
  if (previewWindow && !previewWindow.closed) previewWindow.close();
  if (triggerBlobDownload(finalBlob, filename)) return;
  if (openBlobPreview(finalBlob, filename, null)) return;
  throw new Error(
    "The browser blocked the image export. Try again with pop-ups/downloads allowed.",
  );
}
