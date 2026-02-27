export const colors = {
  bg: "#F5F6F8",
  surface: "#FFFFFF",
  textPrimary: "#111111",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  divider: "#ECEEF2",
  chipBg: "#F3F4F6",
  chipActiveBg: "#111111",
  chipActiveText: "#FFFFFF",
  dangerBg: "#FAD2D2",
  dangerText: "#B42318",
  work: "#F7C6C7",
  personal: "#CFE8FF",
  health: "#D7F5DD",
  finance: "#F4E6C9"
} as const;

export const radii = {
  cardLg: 24,
  cardMd: 18,
  input: 16,
  pill: 999,
  sheetTop: 28
} as const;

export const shadow = {
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffsetY: 12,
  elevation: 3
} as const;

export const spacing = {
  screen: 20,
  card: 16,
  section: 14,
  rowMin: 56,
  rowMax: 64,
  touchMin: 44
} as const;

export const typography = {
  h1: { fontSize: 30, lineHeight: 36, fontWeight: "600" },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" }
} as const;

export const tokens = {
  colors,
  radii,
  shadow,
  spacing,
  typography
} as const;

export type Category = "work" | "personal" | "health" | "finance";

export const categoryColorMap: Record<Category, string> = {
  work: colors.work,
  personal: colors.personal,
  health: colors.health,
  finance: colors.finance
};

export const webShadow =
  "0 12px 24px rgba(17, 17, 17, 0.06), 0 2px 6px rgba(17, 17, 17, 0.03)";

export const tailwindThemeExtension = {
  colors,
  borderRadius: {
    cardLg: `${radii.cardLg}px`,
    cardMd: `${radii.cardMd}px`,
    input: `${radii.input}px`,
    pill: `${radii.pill}px`
  },
  boxShadow: {
    card: webShadow
  },
  spacing: {
    screen: `${spacing.screen}px`,
    card: `${spacing.card}px`,
    section: `${spacing.section}px`
  }
};
