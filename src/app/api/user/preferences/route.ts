import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import type { AccentId, ColorMode, UiDensity } from "@/lib/themes";
import {
  UI_DENSITY_OPTIONS,
  DEFAULT_DENSITY,
  DEFAULT_COLOR_MODE,
  isValidThemeId,
  isAccentId,
  normalizeThemeId,
  parseStoredTheme,
  formatStoredTheme,
  themeDefaultColorMode,
} from "@/lib/themes";

const patchSchema = z.object({
  theme: z.string().optional(),
  accent: z.string().optional(),
  uiDensity: z.enum(["compact", "standard", "large"]).optional(),
  colorMode: z.enum(["dark", "light"]).optional(),
});

function resolvePrefs(rawTheme: string | null | undefined, rawAccent?: unknown) {
  const parsed = parseStoredTheme(rawTheme);
  const theme = normalizeThemeId(rawTheme);
  const accent: AccentId = isAccentId(rawAccent) ? rawAccent : parsed.accent;
  return { theme, accent };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    let profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { theme: true, uiDensity: true, colorMode: true },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: { userId: session.user.id },
        select: { theme: true, uiDensity: true, colorMode: true },
      });
    }

    const { theme, accent } = resolvePrefs(profile.theme);
    const uiDensity = (profile.uiDensity as UiDensity) || DEFAULT_DENSITY;
    const colorMode: ColorMode =
      profile.colorMode === "light" || profile.colorMode === "dark"
        ? profile.colorMode
        : themeDefaultColorMode(theme);

    return jsonOk({
      theme,
      accent,
      uiDensity: UI_DENSITY_OPTIONS.some((d) => d.id === uiDensity)
        ? uiDensity
        : DEFAULT_DENSITY,
      colorMode: colorMode ?? DEFAULT_COLOR_MODE,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    if (parsed.data.theme != null && !isValidThemeId(parsed.data.theme)) {
      return jsonError("Ungültiges Theme", 400);
    }
    if (parsed.data.accent != null && !isAccentId(parsed.data.accent)) {
      return jsonError("Ungültiger Akzent", 400);
    }

    const existing = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { theme: true },
    });
    const current = resolvePrefs(existing?.theme);

    const nextAppearance = parsed.data.theme
      ? normalizeThemeId(parsed.data.theme)
      : current.theme;
    const fromCompound = parsed.data.theme
      ? parseStoredTheme(parsed.data.theme).accent
      : current.accent;
    const nextAccent: AccentId = isAccentId(parsed.data.accent)
      ? parsed.data.accent
      : parsed.data.theme?.includes(":")
        ? fromCompound
        : current.accent;

    const storedTheme = formatStoredTheme(nextAppearance, nextAccent);
    const themeChanged =
      parsed.data.theme != null || parsed.data.accent != null;

    const colorMode =
      parsed.data.colorMode ??
      (parsed.data.theme ? themeDefaultColorMode(nextAppearance) : undefined);

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        theme: storedTheme,
        uiDensity: parsed.data.uiDensity ?? DEFAULT_DENSITY,
        colorMode: colorMode ?? DEFAULT_COLOR_MODE,
      },
      update: {
        ...(themeChanged ? { theme: storedTheme } : {}),
        ...(parsed.data.uiDensity ? { uiDensity: parsed.data.uiDensity } : {}),
        ...(colorMode ? { colorMode } : {}),
      },
      select: { theme: true, uiDensity: true, colorMode: true },
    });

    const resolved = resolvePrefs(profile.theme);
    return jsonOk({
      theme: resolved.theme,
      accent: resolved.accent,
      uiDensity: profile.uiDensity,
      colorMode: profile.colorMode,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
