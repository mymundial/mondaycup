const REWARD_STICKER_KEYS = ["kit", "flag", "champions", "stopper", "talisman", "striker"];

export function getUnopenedNationStickerNoticeKey(nationStickerProgress = {}, currentTeam = null) {
  const entries = [];
  const records = currentTeam && nationStickerProgress?.[currentTeam]
    ? [[currentTeam, nationStickerProgress[currentTeam]]]
    : Object.entries(nationStickerProgress || {});

  records.forEach(([nation, record = {}]) => {
    const claimable = record?.claimable || {};
    const opened = record?.opened || {};
    REWARD_STICKER_KEYS.forEach((key) => {
      if (claimable?.[key] && !opened?.[key]) entries.push(`${nation}:${key}`);
    });
  });

  return entries.length ? entries.sort().join("|") : "";
}

export function hasUnopenedNationSticker(nationStickerProgress = {}, currentTeam = null) {
  return Boolean(getUnopenedNationStickerNoticeKey(nationStickerProgress, currentTeam));
}
