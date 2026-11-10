import { duration } from "../ui/motion";
import { space } from "../ui/tokens";

export const GLYPH = 13;

export const TOOLBAR_MOTION = { dim: duration.base, progress: duration.base, hide: duration.base, show: duration.base, settle: 0 } as const;

export const DEV_BAR = { stripeWidth: 5, stripePeriod: 12, stripeAlpha: { dark: 0.14, light: 0.1 }, badgeFillAlpha: 0.18, badgeHeight: 16, urlGap: space.s, showTools: 300, showConsole: 420 } as const;
