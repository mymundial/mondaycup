import { useEffect, useState } from "react";
import { loadLeaderboardRows } from "../../lib/firebaseUser.js";
import { safeReadLeaderboardRows } from "../../logic/appState.js";

function scoreOf(row = {}) {
  return Number(row.gameScore ?? row.campaignPoints ?? row.points ?? row.bestCampaign?.gameScore ?? row.bestCampaign?.campaignPoints ?? row.bestCampaign?.points ?? 0) || 0;
}

function isLocalGuestRow(row = {}) {
  const userId = String(row.userId || row.uid || row.id || "");
  return Boolean(row.localOnly || row.isUserPreview || userId === "guest-local" || userId === "guest-preview");
}

function hasUsedUpgrade(row = {}) {
  const bestCampaign = row.bestCampaign && typeof row.bestCampaign === "object" ? row.bestCampaign : {};
  const sources = [
    row,
    row.cosmeticsApplied,
    row.activeCosmetics,
    row.upgradesApplied,
    row.upgradesUsed,
    row.usedUpgrades,
    bestCampaign,
    bestCampaign.cosmeticsApplied,
    bestCampaign.activeCosmetics,
    bestCampaign.upgradesApplied,
    bestCampaign.upgradesUsed,
    bestCampaign.usedUpgrades,
  ].filter((source) => source && typeof source === "object");

  const truthy = (value) => {
    if (Array.isArray(value)) return value.some(truthy);
    if (value && typeof value === "object") {
      if (Object.prototype.hasOwnProperty.call(value, "active")) return truthy(value.active);
      if (Object.prototype.hasOwnProperty.call(value, "enabled")) return truthy(value.enabled);
      if (Object.prototype.hasOwnProperty.call(value, "equipped")) return truthy(value.equipped);
      if (Object.prototype.hasOwnProperty.call(value, "used")) return truthy(value.used);
      if (Object.prototype.hasOwnProperty.call(value, "quantity")) return Number(value.quantity || 0) > 0;
      return Object.values(value).some(truthy);
    }
    if (typeof value === "string") return !["", "false", "0", "no", "none", "off"].includes(value.trim().toLowerCase());
    return Boolean(value);
  };

  const aliases = {
    goldenBoot: ["goldenBoot", "golden_boot", "boot", "cosmetic3", "cosmeticBoot", "cosmeticBootEquipped", "goldenBootEquipped"],
    goldenBall: ["goldenBall", "golden_ball", "ball", "cosmeticBall", "cosmeticBallEquipped", "goldenBallEquipped"],
    goldenGlove: ["goldenGlove", "golden_glove", "glove", "cosmeticGlove", "cosmeticGloveEquipped", "goldenGloveEquipped"],
    goldenTicket: ["goldenTicket", "golden_ticket", "ticket", "cosmetic4", "goldenTicketUsed", "usedGoldenTicket"],
  };
  const genericFlags = ["usedGoldenUpgrade", "goldenUpgradeUsed", "cosmeticsUsed", "cosmeticsAppliedToCampaign", "hasCosmeticsApplied", "hasGoldenUpgrade"];

  return Object.values(aliases).some((keys) =>
    sources.some((source) => keys.some((key) => truthy(source[key]))),
  ) || sources.some((source) => genericFlags.some((key) => truthy(source[key])));
}

function chooseBetterRow(existing, row) {
  if (!existing) return row;
  const rowScore = scoreOf(row);
  const existingScore = scoreOf(existing);
  if (rowScore > existingScore) return row;
  if (rowScore < existingScore) return existing;
  if (hasUsedUpgrade(row) && !hasUsedUpgrade(existing)) return row;
  return existing;
}

function mergeLeaderboardRows(localRows, cloudRows) {
  const byUser = new Map();

  cloudRows.filter((row) => row && !isLocalGuestRow(row)).forEach((row) => {
    const userId = row.userId || row.uid || row.id || row.username;
    if (!userId || scoreOf(row) <= 0) return;
    byUser.set(userId, chooseBetterRow(byUser.get(userId), row));
  });

  localRows.filter(isLocalGuestRow).forEach((row) => {
    const userId = row.userId || row.uid || row.id || "guest-local";
    if (scoreOf(row) <= 0) return;
    byUser.set(userId, chooseBetterRow(byUser.get(userId), { ...row, localOnly: true }));
  });

  return Array.from(byUser.values())
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .slice(0, 50);
}

export function useLeaderboardRows() {
  const [leaderboardRows, setLeaderboardRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const localRows = safeReadLeaderboardRows();

    loadLeaderboardRows(50)
      .then((rows) => {
        if (cancelled) return;
        setLeaderboardRows(mergeLeaderboardRows(localRows, rows));
      })
      .catch((error) => {
        console.warn("Cloud leaderboard load failed", error);
        if (!cancelled) setLeaderboardRows(mergeLeaderboardRows(localRows, []));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return [leaderboardRows, setLeaderboardRows];
}
