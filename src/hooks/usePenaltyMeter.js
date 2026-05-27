import { useCallback, useEffect, useRef, useState } from "react";
import { GAME, clamp } from "../logic/penaltyEngine.js";

export function usePenaltyMeter(active, options = {}) {
  const {
    mode = "bounce",
    speedMultiplier = 1,
    step = GAME.meterStep,
    tickMs = GAME.meterTickMs,
    initialValue = 0,
  } = options;

  const [value, setValue] = useState(initialValue);
  const directionRef = useRef(1);

  const reset = useCallback((nextValue = initialValue) => {
    directionRef.current = 1;
    setValue(clamp(nextValue, 0, 100));
  }, [initialValue]);

  useEffect(() => {
    if (!active) return undefined;

    const interval = window.setInterval(() => {
      setValue((current) => {
        const increment = step * speedMultiplier;

        if (mode === "charge") {
          return clamp(current + increment, 0, 100);
        }

        let next = current + increment * directionRef.current;
        if (next >= 100) {
          next = 100;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [active, mode, speedMultiplier, step, tickMs]);

  return { value, reset };
}
