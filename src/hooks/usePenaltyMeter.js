import { useEffect, useMemo, useState } from "react";
import { GAME } from "../logic/penaltyEngine.js";

export function usePenaltyMeter(active) {
  const [value, setValue] = useState(0);
  const [up, setUp] = useState(true);

  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => {
      setValue((current) => {
        if (current >= 100) {
          setUp(false);
          return 100 - GAME.meterStep;
        }
        if (current <= 0) {
          setUp(true);
          return GAME.meterStep;
        }
        return current + (up ? GAME.meterStep : -GAME.meterStep);
      });
    }, GAME.meterTickMs);
    return () => window.clearInterval(id);
  }, [active, up]);

  return useMemo(
    () => ({
      value,
      reset() {
        setValue(0);
        setUp(true);
      },
    }),
    [value]
  );
}
