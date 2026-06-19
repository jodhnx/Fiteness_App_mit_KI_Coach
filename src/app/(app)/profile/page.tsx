import { redirect } from "next/navigation";

/** Profil ist in Account (Einstellungen) integriert */
export default function ProfileRedirectPage() {
  redirect("/settings");
}
