import { CredentialsSignin } from "next-auth";

export class UnverifiedEmailError extends CredentialsSignin {
  code = "email_not_verified";
}

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export class DatabaseConnectionError extends CredentialsSignin {
  code = "database_connection";
}

export function getLoginErrorMessage(code: string | undefined): string {
  switch (code) {
    case "email_not_verified":
      return "Bitte bestätige zuerst deine E-Mail-Adresse.";
    case "invalid_credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "database_connection":
      return "Datenbank nicht erreichbar. Prüfe Supabase DATABASE_URL / DIRECT_URL in .env.";
    case "CredentialsSignin":
    case "credentials":
      return "E-Mail oder Passwort ist falsch.";
    default:
      return "Anmeldung fehlgeschlagen.";
  }
}
