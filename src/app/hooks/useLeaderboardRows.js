import { useEffect, useState } from "react";
import { loadLeaderboardRows } from "../../lib/firebaseUser.js";
import { safeReadLeaderboardRows } from "../../logic/appState.js";

function mergeLeaderboardRows(localRows, cloudRows) {
  const byUser = new Map();
  [...localRows, ...cloudRows].forEach((row) => {
    const userId = row.userId || row.uid || row.id || row.username;
    if (!userId) return;
    const existing = byUser.get(userId);
    if (
      !existing ||
      Number(row.campaignPoints || row.gameScore || 0) >
        Number(existing.campaignPoints || existing.gameScore || 0)
    ) {
      byUser.set(userId, row);
    }
  });

  return Array.from(byUser.values())
    .sort(
      (a, b) =>
        Number(b.campaignPoints || b.gameScore || 0) -
        Number(a.campaignPoints || a.gameScore || 0),
    )
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
        if (!cancelled) setLeaderboardRows(localRows);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return [leaderboardRows, setLeaderboardRows];
}
