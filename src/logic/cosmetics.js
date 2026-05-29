export const COSMETICS_KEY = "mondayCup.clubhouseCosmetics";
export const GOLDEN_BOOT_SRC = "/assets/game/golden-boot.png";
export const GOLDEN_BALL_SRC = "/assets/game/golden-ball.png";
export const GOLDEN_GLOVE_SRC = "/assets/game/golden-glove.png";
export const GOLDEN_TICKET_SRC = "/assets/game/golden-ticket.png";

export const DEFAULT_COSMETICS = {
  goldenBoot: false,
  goldenBall: false,
  goldenGlove: false,
  goldenTicket: false,
  goldenTicketQuantity: 0,
};

export function normaliseActiveCosmetics(source = {}) {
  const goldenTicketQuantity = Number(source.goldenTicketQuantity ?? source.consumables?.goldenTicket?.quantity ?? (source.goldenTicket ? 1 : 0));
  return {
    ...DEFAULT_COSMETICS,
    ...source,
    goldenBoot: Boolean(source.goldenBoot ?? source.cosmetic3 ?? false),
    goldenBall: Boolean(source.goldenBall ?? false),
    goldenGlove: Boolean(source.goldenGlove ?? false),
    goldenTicket: Boolean(source.goldenTicket ?? source.cosmetic4 ?? goldenTicketQuantity > 0),
    goldenTicketQuantity: Math.max(0, Math.floor(Number.isFinite(goldenTicketQuantity) ? goldenTicketQuantity : 0)),
  };
}

export function readActiveCosmetics(storage = globalThis?.localStorage) {
  if (!storage) return { ...DEFAULT_COSMETICS };
  try {
    return normaliseActiveCosmetics(JSON.parse(storage.getItem(COSMETICS_KEY) || "{}"));
  } catch {
    return { ...DEFAULT_COSMETICS };
  }
}
