export type LevelInfo = {
  level: number;
  name: string;
  minXP: number;
  maxXP: number;
  xpToNext: number;
  progressPercent: number;
};

const MAX_LEVEL = 100;

/** XP required to complete level L (from start of L to start of L+1) */
function xpRequiredForLevel(level: number): number {
  if (level < 1 || level >= MAX_LEVEL) return 0;
  return Math.floor(80 + level * 22 + Math.pow(level, 1.35) * 8);
}

function cumulativeXPForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpRequiredForLevel(l);
  return total;
}

export function getLevelFromXP(totalXP: number): LevelInfo {
  const xp = Math.max(0, totalXP);
  let level = 1;
  while (level < MAX_LEVEL && xp >= cumulativeXPForLevel(level + 1)) {
    level++;
  }
  const minXP = cumulativeXPForLevel(level);
  const nextMin = level < MAX_LEVEL ? cumulativeXPForLevel(level + 1) : minXP + xpRequiredForLevel(level);
  const maxXP = nextMin - 1;
  const span = Math.max(1, nextMin - minXP);
  const inLevel = xp - minXP;
  const xpToNext = level < MAX_LEVEL ? nextMin - xp : 0;
  const progressPercent =
    level >= MAX_LEVEL ? 100 : Math.min(100, Math.round((inLevel / span) * 100));

  return {
    level,
    name: `Level ${level}`,
    minXP,
    maxXP,
    xpToNext,
    progressPercent,
  };
}

export function buildLevelTable(): { id: number; name: string; minXP: number; maxXP: number }[] {
  const rows: { id: number; name: string; minXP: number; maxXP: number }[] = [];
  for (let l = 1; l <= MAX_LEVEL; l++) {
    const info = getLevelFromXP(cumulativeXPForLevel(l));
    rows.push({
      id: l,
      name: info.name,
      minXP: info.minXP,
      maxXP: info.maxXP,
    });
  }
  return rows;
}
