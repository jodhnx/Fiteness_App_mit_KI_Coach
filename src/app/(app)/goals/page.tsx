import { redirect } from "next/navigation";

/** Ziele werden in Account/Einstellungen bearbeitet. */
export default function GoalsRedirectPage() {
  redirect("/settings#settings-ziele");
}
