import { LiveWorkout } from "@/components/workout/live-workout";

type Props = { params: Promise<{ sessionId: string }> };

export default async function LiveWorkoutPage({ params }: Props) {
  const { sessionId } = await params;
  return <LiveWorkout sessionId={sessionId} />;
}
