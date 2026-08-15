/**
 * Intentionally empty — route transitions must NOT show a loading screen.
 * Boot splash lives only in root layout (#nexform-boot) for cold start.
 * Tab switches rely on router cache + client data caches for instant paint.
 */
export default function AppLoading() {
  return null;
}
