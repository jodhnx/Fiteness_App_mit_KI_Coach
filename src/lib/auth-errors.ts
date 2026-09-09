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
      return "Anmeldung vorübergehend nicht möglich. Bitte in wenigen Sekunden erneut versuchen.";
    case "CredentialsSignin":
    case "credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "Configuration":
      return "Anmeldung ist nicht konfiguriert. Bitte später erneut versuchen.";
    case "csrf_failed":
      return "Sicherheits-Token fehlt. Seite neu laden und erneut versuchen.";
    case "invalid_response":
      return "Ungültige Antwort vom Auth-Server.";
    case "AccessDenied":
      return "Anmeldung abgelehnt.";
    default:
      return "Anmeldung fehlgeschlagen.";
  }
}
