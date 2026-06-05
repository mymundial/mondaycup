import { useEffect, useMemo, useState } from "react";
import { STORE_BUNDLES, STORE_CATALOGUE, STORE_ITEM_IDS, STORE_ITEMS, formatStorePrice, normaliseTicketQuantity, priceForSelection } from "../../data/storeItems.js";
import { ASSETS } from "../../data/assets.js";
import YellowButton from "../ui/YellowButton.jsx";

const itemOrder = STORE_CATALOGUE.map((item) => item.id);
const BUNDLE_CORE_ITEM_IDS = [
  STORE_ITEM_IDS.allTeams,
  STORE_ITEM_IDS.goldenBoot,
  STORE_ITEM_IDS.goldenBall,
  STORE_ITEM_IDS.goldenGlove,
];
const BUNDLE_TRIGGER_ITEM_IDS = [...BUNDLE_CORE_ITEM_IDS, STORE_ITEM_IDS.goldenTicket];

function CloseIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" aria-hidden="true">
      <path d="M5 5l14 14" />
      <path d="M19 5L5 19" />
    </svg>
  );
}

function ownedStateForItem(item, entitlements = {}) {
  if (!item) return false;
  if (item.id === STORE_ITEM_IDS.fullBundle) return false;
  if (item.id === STORE_ITEM_IDS.allTeams) return Boolean(entitlements.allTeams);
  if (item.id === STORE_ITEM_IDS.goldenTicket) return normaliseTicketQuantity(entitlements.goldenTicketQty) >= STORE_ITEMS.goldenTicket.maxQuantity;
  return Boolean(entitlements[item.id]);
}

function bundleUnavailableReason(entitlements = {}) {
  const ticketQty = normaliseTicketQuantity(entitlements.goldenTicketQty);
  if (ticketQty >= STORE_ITEMS.goldenTicket.maxQuantity) return "MAX";
  if (
    entitlements.allTeams ||
    entitlements.goldenBoot ||
    entitlements.goldenBall ||
    entitlements.goldenGlove
  ) {
    return "OWNED ITEM";
  }
  return "";
}

function StoreRow({
  item,
  selectedQty = 0,
  owned = false,
  disabled = false,
  inactive = false,
  ticketQty = 0,
  maxTicketPurchaseQty = STORE_ITEMS.goldenTicket.maxQuantity,
  onToggle,
  onTicketQtyChange,
}) {
  const isTicket = item.id === STORE_ITEM_IDS.goldenTicket;
  const isBundle = item.id === STORE_ITEM_IDS.fullBundle;
  const selected = selectedQty > 0;
  const inactiveReason = typeof inactive === "string" ? inactive : "";
  const maxTicketsReached = isTicket && maxTicketPurchaseQty <= 0;
  const selectDisabled = disabled || owned || inactive || (isTicket && maxTicketsReached && !selected);
  const displayPrice = owned
    ? item.id === STORE_ITEM_IDS.allTeams ? "UNLOCKED" : isTicket ? "MAX" : "OWNED"
    : maxTicketsReached || inactiveReason === "MAX"
      ? "MAX"
      : item.priceLabel;

  return (
    <div className={`relative grid grid-cols-[32px_44px_minmax(0,1fr)_auto_minmax(48px,auto)] items-center gap-2 rounded-[1rem] border px-2 py-2 shadow-[0_6px_14px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(245,241,232,0.06)] ring-1 transition ${selected ? "border-[#F7D117]/72 bg-[#052D1D]/84 ring-[#F7D117]/26" : "border-[#F5F1E8]/14 bg-[#052D1D]/68 ring-[#F5F1E8]/10"} ${selectDisabled && !selected ? "opacity-60" : "opacity-100"}`}>
      <button
        type="button"
        disabled={selectDisabled}
        onClick={() => onToggle?.(item.id)}
        className={`grid h-8 w-8 place-items-center rounded-[0.65rem] border ${selected ? "border-[#F7D117] bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/20 bg-[#031B12]/54 text-[#F5F1E8]"} disabled:cursor-default`}
        aria-label={`Select ${item.title}`}
      >
        <span className="home-copy-bold text-[14px] leading-none">{selected ? "✓" : ""}</span>
      </button>

      <div className="grid h-11 w-11 place-items-center rounded-full border border-[#F5F1E8]/12 bg-[#072D1D]/92">
        {item.assetSrc ? <img src={item.assetSrc} alt="" className="h-9 w-9 object-contain drop-shadow-[0_4px_7px_rgba(0,0,0,0.28)]" draggable={false} /> : null}
      </div>

      <div className="min-w-0 text-left">
        {isBundle ? <div className="home-copy-bold mb-1 text-[7px] uppercase leading-none tracking-[0.1em] text-[#F7D117]/86">BEST VALUE</div> : null}
        <div className="home-copy-bold truncate text-[11px] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">{item.title}</div>
        <div className="home-copy-regular mt-1 truncate text-[7.5px] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]/68">{item.subtitle}</div>
        {isBundle ? (
          <div className="mt-1.5 flex items-center gap-1">
            {BUNDLE_TRIGGER_ITEM_IDS.map((bundleItemId) => {
              const bundleItem = STORE_ITEMS[bundleItemId] || STORE_BUNDLES[bundleItemId];
              return bundleItem?.assetSrc ? (
                <span key={bundleItemId} className="grid h-5 w-5 place-items-center rounded-full border border-[#F5F1E8]/14 bg-[#031B12]/54">
                  <img src={bundleItem.assetSrc} alt="" className="h-4 w-4 object-contain" draggable={false} />
                </span>
              ) : null;
            })}
          </div>
        ) : null}
        {inactive ? (
          <div className="home-copy-bold mt-1 text-[7px] uppercase leading-none tracking-[0.1em] text-[#F5F1E8]/58">
            {inactiveReason === "MAX" ? "MAX GOLDEN TICKETS" : "UNAVAILABLE WITH OWNED ITEMS"}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-[104px] items-center justify-end">
        {isTicket && selected && !owned && !maxTicketsReached ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onTicketQtyChange?.(Math.max(1, selectedQty - 1))} className="grid h-8 w-8 place-items-center rounded-[0.55rem] bg-[#F5F1E8]/10 home-copy-bold text-[12px] text-[#F5F1E8]">−</button>
            <span className="grid h-8 min-w-9 place-items-center rounded-[0.55rem] bg-[#F7D117] px-2 home-copy-bold text-[10px] text-[#072D1D]">{selectedQty}</span>
            <button type="button" disabled={selectedQty >= maxTicketPurchaseQty} onClick={() => onTicketQtyChange?.(selectedQty + 1)} className="grid h-8 w-8 place-items-center rounded-[0.55rem] bg-[#F5F1E8]/10 home-copy-bold text-[12px] text-[#F5F1E8] disabled:opacity-35">+</button>
          </div>
        ) : isTicket ? (
          <div className="home-copy-regular text-[7px] uppercase tracking-[0.08em] text-[#F5F1E8]/50">{ticketQty}/99</div>
        ) : null}
      </div>

      <div className="flex min-w-[48px] items-center justify-end text-right">
        <div className="home-copy-bold text-[11px] uppercase leading-none tracking-[0.07em] text-[#F7D117]">{displayPrice}</div>
      </div>
    </div>
  );
}

function buildInitialSelection(initialItemId, entitlements = {}) {
  const items = {};
  const id = initialItemId || STORE_ITEM_IDS.fullBundle;
  if (id === STORE_ITEM_IDS.goldenTicket) {
    const ownedQty = normaliseTicketQuantity(entitlements.goldenTicketQty);
    items.goldenTicket = ownedQty >= STORE_ITEMS.goldenTicket.maxQuantity ? 0 : 1;
  } else if (id === STORE_ITEM_IDS.fullBundle) {
    if (!bundleUnavailableReason(entitlements)) items.fullBundle = 1;
  } else if (id && !ownedStateForItem({ id }, entitlements)) {
    items[id] = 1;
  }
  return { items };
}

export default function ShopModal({ open = false, onClose, initialItemId = null, entitlements = {}, onCheckout, currentUser = null }) {
  const [selection, setSelection] = useState(() => buildInitialSelection(initialItemId, entitlements));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setSelection(buildInitialSelection(initialItemId, entitlements));
      setMessage("");
    }
  }, [open, initialItemId, entitlements?.allTeams, entitlements?.goldenBall, entitlements?.goldenBoot, entitlements?.goldenGlove, entitlements?.goldenTicketQty]);

  const ticketQty = normaliseTicketQuantity(entitlements.goldenTicketQty);
  const bundleSelected = Boolean(selection.items?.fullBundle);
  const total = useMemo(() => priceForSelection(selection), [selection]);
  const selectedCount = Object.values(selection.items || {}).reduce((sum, qty) => sum + Math.max(0, Number(qty || 0)), 0);
  const bundleInactive = bundleUnavailableReason(entitlements);

  if (!open) return null;

  const maxTicketPurchaseQtyForItems = (items = {}) => {
    const bundleTicket = Number(items.fullBundle || 0) > 0 ? 1 : 0;
    return Math.max(0, STORE_ITEMS.goldenTicket.maxQuantity - ticketQty - bundleTicket);
  };

  const normaliseSelectionItems = (items = {}) => {
    const nextItems = { ...items };

    if (bundleInactive) delete nextItems.fullBundle;

    Object.keys(nextItems).forEach((id) => {
      if (id !== STORE_ITEM_IDS.goldenTicket && id !== STORE_ITEM_IDS.fullBundle) {
        const item = STORE_ITEMS[id];
        if (ownedStateForItem(item, entitlements)) delete nextItems[id];
      }
    });

    if (!bundleInactive && !nextItems.fullBundle) {
      const hasAllBundleItems = BUNDLE_TRIGGER_ITEM_IDS.every((id) => Number(nextItems[id] || 0) > 0);
      if (hasAllBundleItems) {
        const selectedTicketQty = Math.max(1, Math.floor(Number(nextItems.goldenTicket || 0)));
        BUNDLE_CORE_ITEM_IDS.forEach((id) => delete nextItems[id]);
        nextItems.fullBundle = 1;
        const extraTicketQty = selectedTicketQty - 1;
        if (extraTicketQty > 0) nextItems.goldenTicket = extraTicketQty;
        else delete nextItems.goldenTicket;
      }
    }

    if (nextItems.fullBundle) {
      BUNDLE_CORE_ITEM_IDS.forEach((id) => delete nextItems[id]);
    }

    const maxTicketPurchaseQty = maxTicketPurchaseQtyForItems(nextItems);
    if (Number(nextItems.goldenTicket || 0) > 0) {
      const safeTicketQty = Math.max(0, Math.min(maxTicketPurchaseQty, Math.floor(Number(nextItems.goldenTicket || 0))));
      if (safeTicketQty > 0) nextItems.goldenTicket = safeTicketQty;
      else delete nextItems.goldenTicket;
    }

    return nextItems;
  };

  const toggleItem = (id) => {
    setMessage("");
    setSelection((current) => {
      const nextItems = { ...(current.items || {}) };
      const currentlySelected = Number(nextItems[id] || 0) > 0;
      if (currentlySelected) {
        delete nextItems[id];
      } else {
        if (id === STORE_ITEM_IDS.fullBundle) {
          if (bundleInactive) return current;
          BUNDLE_CORE_ITEM_IDS.forEach((key) => delete nextItems[key]);
          nextItems.fullBundle = 1;
        } else if (id === STORE_ITEM_IDS.goldenTicket) {
          const maxTicketPurchaseQty = maxTicketPurchaseQtyForItems(nextItems);
          if (maxTicketPurchaseQty <= 0) return current;
          nextItems.goldenTicket = 1;
        } else {
          if (nextItems.fullBundle) return current;
          nextItems[id] = 1;
        }
      }
      return { items: normaliseSelectionItems(nextItems) };
    });
  };

  const setTicketQty = (qty) => {
    setSelection((current) => {
      const nextItems = { ...(current.items || {}) };
      const maxTicketPurchaseQty = maxTicketPurchaseQtyForItems(nextItems);
      const safeQty = Math.max(1, Math.min(maxTicketPurchaseQty, Math.floor(Number(qty || 1))));
      nextItems.goldenTicket = safeQty;
      return { items: normaliseSelectionItems(nextItems) };
    });
  };

  const pay = async () => {
    if (!currentUser?.uid) {
      setMessage("Please sign in before buying upgrades");
      return;
    }
    if (!selectedCount || total <= 0) {
      setMessage("Select at least one item");
      return;
    }
    try {
      setBusy(true);
      setMessage("");
      await onCheckout?.(selection);
    } catch (error) {
      setMessage(error?.message || "Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#031B12]/72 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-[6px]" style={{ zIndex: 2147483647 }}>
      <button type="button" aria-label="Close shop" onClick={onClose} className="absolute inset-0 z-[0]" />
      <aside
        className="pointer-events-auto relative z-[1] w-full max-w-[430px] overflow-hidden rounded-[1.7rem] border border-[#F5F1E8]/14 text-[#F5F1E8] shadow-[0_24px_54px_rgba(0,0,0,0.35)]"
        style={{
          backgroundColor: "#0B5F35",
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)",
          backgroundSize: "100% 100%",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(247,209,23,0.10),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.09))]" />
        <div className="relative p-4">
          <div className="mb-3 grid h-12 grid-cols-[44px_1fr_44px] items-center gap-2">
            <div className="grid h-11 w-11 place-items-center justify-self-start">
              <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.3)]" draggable={false} />
            </div>
            <div className="home-copy-bold self-center text-center text-[25px] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]">CLUB STORE</div>
            <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center justify-self-end rounded-[0.9rem] bg-[#031B12]/46 text-[#F5F1E8]" aria-label="Close shop"><CloseIcon /></button>
          </div>

          <div className="space-y-2 rounded-[1.25rem] border border-[#F5F1E8]/12 bg-[#031B12]/24 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {itemOrder.map((id) => {
              const item = STORE_ITEMS[id] || STORE_BUNDLES[id];
              if (!item) return null;
              const owned = item.id === STORE_ITEM_IDS.fullBundle ? false : ownedStateForItem(item, entitlements);
              const inactive = item.id === STORE_ITEM_IDS.fullBundle && bundleInactive;
              const disabled = inactive || (bundleSelected && item.id !== STORE_ITEM_IDS.fullBundle && item.id !== STORE_ITEM_IDS.goldenTicket);
              return (
                <StoreRow
                  key={item.id}
                  item={item}
                  selectedQty={Number(selection.items?.[item.id] || 0)}
                  owned={owned}
                  disabled={disabled}
                  inactive={inactive}
                  ticketQty={ticketQty}
                  maxTicketPurchaseQty={item.id === STORE_ITEM_IDS.goldenTicket ? maxTicketPurchaseQtyForItems(selection.items || {}) : STORE_ITEMS.goldenTicket.maxQuantity}
                  onToggle={toggleItem}
                  onTicketQtyChange={setTicketQty}
                />
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[1rem] border border-[#F7D117]/30 bg-[#031B12]/42 px-3 py-3">
            <div>
              <div className="home-copy-bold text-[10px] uppercase tracking-[0.12em] text-[#F5F1E8]/72">Total</div>
              <div className="home-copy-bold text-[24px] uppercase leading-none tracking-[0.08em] text-[#F7D117]">{formatStorePrice(total)}</div>
            </div>
            <YellowButton onClick={pay} disabled={busy || !selectedCount || !currentUser?.uid}>{busy ? "LOADING..." : "PAY WITH STRIPE"}</YellowButton>
          </div>

          {!currentUser?.uid ? (
            <div className="mt-2 rounded-[0.9rem] border border-[#F7D117]/24 bg-[#F7D117]/10 px-3 py-2 text-center home-copy-bold text-[9px] uppercase tracking-[0.09em] text-[#F7D117]">Sign in before buying upgrades</div>
          ) : null}
          {message ? <div className="mt-2 rounded-[0.9rem] border border-[#B94135]/34 bg-[#B94135]/22 px-3 py-2 text-center home-copy-regular text-[10px] uppercase tracking-[0.08em] text-[#F5F1E8]">{message}</div> : null}
        </div>
      </aside>
    </div>
  );
}
