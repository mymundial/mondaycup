Monday Cup shooting mechanic update
===================================

This update changes the penalty system from click-to-stop power into a hold-and-release power mechanic.

Flow:
1. Select shot direction.
2. Hold POWER and release inside the target zone.
3. Accuracy meter speed is affected by the power result.
4. Confirm accuracy inside the direction-specific target zone.

Current Normal-mode rules implemented:
- Power target: 45-55%.
- If power lands between 45-55%, the accuracy marker moves at normal speed.
- If power lands above 55%, the accuracy marker speeds up incrementally up to +15% at 100% power.
- If power lands below 45%, accuracy speed stays normal but the shot gains an underpowered save penalty of up to +20 percentage points.
- If aiming top middle, power 60-64% hits the crossbar.
- If aiming top middle, power 65%+ goes over the bar.

Accuracy rules:
- Left-side shots target 20-30% on the accuracy meter.
- Middle shots target 45-55% on the accuracy meter.
- Right-side shots target 70-80% on the accuracy meter.
- Left-side miss zones: 0-10 wide, 10-15 post, 15-20 saved, 30-100 saved.
- Right-side miss zones mirror left: 90-100 wide, 85-90 post, 80-85 saved, 0-70 saved.
- Middle misses are saved by the goalkeeper moving left or right depending on the side of the miss.

Difficulty notes for later tuning:

Easy:
Power target: 40-60
Accuracy target width: 15%
Max over-power speed increase: +8%

Normal:
Power target: 45-55
Accuracy target width: 10%
Max over-power speed increase: +15%

Hard:
Power target: 47-53
Accuracy target width: 7%
Max over-power speed increase: +25%
