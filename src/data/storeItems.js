export const MAX_GOLDEN_TICKETS = 99;

export const STORE_ITEM_IDS = {
  allTeams: "allTeams",
  goldenBall: "goldenBall",
  goldenBoot: "goldenBoot",
  goldenGlove: "goldenGlove",
  goldenTicket: "goldenTicket",
  fullBundle: "fullBundle",
};

const envPrice = (key, fallback = "") => {
  try {
    return import.meta?.env?.[key] || fallback;
  } catch {
    return fallback;
  }
};

export const STORE_ITEMS = {
  allTeams: {
    id: STORE_ITEM_IDS.allTeams,
    title: "ALL TEAMS",
    subtitle: "UNLOCK EVERY NATION",
    priceLabel: "£1.99",
    unitAmountPence: 199,
    stripePriceId: envPrice("VITE_STRIPE_PRICE_ALL_TEAMS"),
    entitlementKey: "allTeams",
    type: "permanent_unlock",
    equipMode: "always_on",
    maxQuantity: 1,
    assetSrc: "/assets/branding/monday-cup.webp",
    effect: { unlockAllTeams: true },
  },
  goldenBall: {
    id: STORE_ITEM_IDS.goldenBall,
    title: "GOLDEN BALL",
    subtitle: "+10% SHOT ACCURACY BONUS",
    priceLabel: "£1",
    unitAmountPence: 100,
    stripePriceId: envPrice("VITE_STRIPE_PRICE_GOLDEN_BALL"),
    entitlementKey: "goldenBall",
    type: "equippable_boost",
    equipMode: "optional",
    maxQuantity: 1,
    assetSrc: "/assets/game/golden-ball.webp",
    effect: { accuracyBonus: 0.1 },
  },
  goldenBoot: {
    id: STORE_ITEM_IDS.goldenBoot,
    title: "GOLDEN BOOT",
    subtitle: "+10% SHOT POWER BONUS",
    priceLabel: "£1",
    unitAmountPence: 100,
    stripePriceId: envPrice("VITE_STRIPE_PRICE_GOLDEN_BOOT"),
    entitlementKey: "goldenBoot",
    type: "equippable_boost",
    equipMode: "optional",
    maxQuantity: 1,
    assetSrc: "/assets/game/golden-boot.webp",
    effect: { powerBonus: 0.1 },
  },
  goldenGlove: {
    id: STORE_ITEM_IDS.goldenGlove,
    title: "GOLDEN GLOVE",
    subtitle: "INCREASED GK SAVE CHANCE",
    priceLabel: "£1",
    unitAmountPence: 100,
    stripePriceId: envPrice("VITE_STRIPE_PRICE_GOLDEN_GLOVE"),
    entitlementKey: "goldenGlove",
    type: "equippable_boost",
    equipMode: "optional",
    maxQuantity: 1,
    assetSrc: "/assets/game/golden-glove.webp",
    effect: { goalkeeperBonus: 0.1 },
  },
  goldenTicket: {
    id: STORE_ITEM_IDS.goldenTicket,
    title: "GOLDEN TICKET",
    subtitle: "1x ADVANCE TO FINAL",
    priceLabel: "£1",
    unitAmountPence: 100,
    stripePriceId: envPrice("VITE_STRIPE_PRICE_GOLDEN_TICKET"),
    entitlementKey: "goldenTicket",
    type: "consumable",
    equipMode: "none",
    maxQuantity: MAX_GOLDEN_TICKETS,
    assetSrc: "/assets/game/golden-ticket.webp",
    effect: { advanceToFinal: true },
  },
};

export const STORE_BUNDLES = {
  fullBundle: {
    id: STORE_ITEM_IDS.fullBundle,
    title: "GOLDEN KITBAG",
    subtitle: "INCLUDES ALL UPGRADE ITEMS",
    priceLabel: "£4.99",
    unitAmountPence: 499,
    stripePriceId: envPrice("VITE_STRIPE_PRICE_FULL_BUNDLE"),
    type: "bundle",
    assetSrc: "/assets/game/golden-kitbag.webp",
    grants: {
      allTeams: true,
      goldenBall: true,
      goldenBoot: true,
      goldenGlove: true,
      goldenTicket: 1,
    },
  },
};

export const STORE_CATALOGUE = [
  STORE_BUNDLES.fullBundle,
  STORE_ITEMS.allTeams,
  STORE_ITEMS.goldenBoot,
  STORE_ITEMS.goldenBall,
  STORE_ITEMS.goldenGlove,
  STORE_ITEMS.goldenTicket,
];

export const EQUIPPABLE_STORE_ITEM_IDS = [
  STORE_ITEM_IDS.goldenBall,
  STORE_ITEM_IDS.goldenBoot,
  STORE_ITEM_IDS.goldenGlove,
];

export function priceForSelection(selection = {}) {
  let total = 0;
  const items = selection.items || {};
  Object.entries(items).forEach(([id, quantity]) => {
    const qty = Math.max(0, Math.floor(Number(quantity || 0)));
    if (!qty) return;
    const item = STORE_ITEMS[id] || STORE_BUNDLES[id];
    if (item) total += Number(item.unitAmountPence || 0) * qty;
  });
  return total;
}

export function formatStorePrice(pence = 0) {
  const amount = Number(pence || 0) / 100;
  return amount % 1 === 0 ? `£${amount.toFixed(0)}` : `£${amount.toFixed(2)}`;
}

export function normaliseTicketQuantity(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(MAX_GOLDEN_TICKETS, Math.floor(number)));
}
