/** Standard XP grants — see product spec */
export const XP_REWARDS = {
  TRAINING_SESSION: 50,
  WORKOUT_COMPLETED: 100,
  STEPS_10K: 25,
  PROTEIN_GOAL: 25,
  CALORIE_GOAL: 25,
  WEIGHT_LOGGED: 10,
  ACTIVITY_COMPLETED: 30,
  CHALLENGE_COMPLETED: 200,
} as const;

export type XPAction = keyof typeof XP_REWARDS;
