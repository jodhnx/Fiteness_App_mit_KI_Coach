import { redirect } from "next/navigation";

/** Aktivität ist in Fortschritt integriert — Redirect für alte Links. */
export default function ActivitiesRedirectPage() {
  redirect("/progress");
}
