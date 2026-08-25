import type { CoachContextMode } from "@/lib/coach-actions";

export type CoachContextNeeds = {
  nutrition: boolean;
  training: boolean;
  trainingDetail: boolean;
  weight: boolean;
  activity: boolean;
  goals: boolean;
  savedMeals: boolean;
  prs: boolean;
  trainingPerformance: boolean;
  nutritionPerformance: boolean;
  dailyPlan: boolean;
  dailyIntel: boolean;
  weeklyIntel: boolean;
  adaptive: boolean;
};

/** What to load per intent — minimizes queries and prompt size. */
export function coachContextNeeds(mode: CoachContextMode): CoachContextNeeds {
  switch (mode) {
    case "nutrition":
      return {
        nutrition: true,
        training: false,
        trainingDetail: false,
        trainingPerformance: false,
        nutritionPerformance: true,
        dailyPlan: false,
        weight: false,
        activity: false,
        goals: true,
        savedMeals: true,
        prs: false,
        dailyIntel: true,
        weeklyIntel: true,
        adaptive: true,
      };
    case "training":
      return {
        nutrition: false,
        training: true,
        trainingDetail: true,
        trainingPerformance: true,
        nutritionPerformance: false,
        dailyPlan: false,
        weight: false,
        activity: true,
        goals: true,
        savedMeals: false,
        prs: true,
        dailyIntel: true,
        weeklyIntel: true,
        adaptive: true,
      };
    case "weekly":
      return {
        nutrition: false,
        training: false,
        trainingDetail: false,
        trainingPerformance: false,
        nutritionPerformance: true,
        dailyPlan: false,
        weight: false,
        activity: false,
        goals: true,
        savedMeals: false,
        prs: false,
        dailyIntel: true,
        weeklyIntel: true,
        adaptive: true,
      };
    case "weight":
      return {
        nutrition: true,
        training: true,
        trainingDetail: false,
        trainingPerformance: false,
        nutritionPerformance: false,
        dailyPlan: false,
        weight: true,
        activity: false,
        goals: true,
        savedMeals: false,
        prs: false,
        dailyIntel: true,
        weeklyIntel: true,
        adaptive: true,
      };
    case "plan":
      return {
        nutrition: false,
        training: true,
        trainingDetail: true,
        trainingPerformance: true,
        nutritionPerformance: false,
        dailyPlan: false,
        weight: false,
        activity: true,
        goals: true,
        savedMeals: false,
        prs: true,
        dailyIntel: false,
        weeklyIntel: true,
        adaptive: true,
      };
    default:
      return {
        nutrition: true,
        training: true,
        trainingDetail: false,
        trainingPerformance: true,
        nutritionPerformance: true,
        dailyPlan: true,
        weight: false,
        activity: true,
        goals: true,
        savedMeals: false,
        prs: false,
        dailyIntel: true,
        weeklyIntel: true,
        adaptive: true,
      };
  }
}
