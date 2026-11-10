import { memo, useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import { useTab } from "../../state/browser/hooks";
import { useDeveloperModeOn } from "../../state/site/hooks";
import { ink } from "../ui";
import { useProfileTheme } from "../window/ThemeScope";
import { DEV_BAR } from "./tokens";

const WIDTH_STEP = 128;

const HazardStripes = memo(function HazardStripes({ color, opacity }: { color: string; opacity: number }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const next = { width: Math.ceil(width / WIDTH_STEP) * WIDTH_STEP, height: Math.ceil(height) };
    setSize((was) => (was.width === next.width && was.height === next.height ? was : next));
  };
  const count = size.height ? Math.ceil((size.width + 2 * size.height) / DEV_BAR.stripePeriod) : 0;
  return (
    <View pointerEvents="none" onLayout={onLayout} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, overflow: "hidden" }}>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity }}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: i * DEV_BAR.stripePeriod - size.height,
              top: -size.height / 2,
              width: DEV_BAR.stripeWidth,
              height: size.height * 2,
              backgroundColor: color,
              transform: [{ rotate: "45deg" }],
            }}
          />
        ))}
      </View>
    </View>
  );
});

export function DevStripes({ tabId }: { tabId: string }) {
  const on = useDeveloperModeOn(tabId);
  const profileId = useTab(tabId, (t) => t?.profileId ?? "");
  const theme = useProfileTheme(profileId);
  if (!on) return null;
  const color = theme.powerUpColor ?? (theme.dark ? ink.white : ink.black);
  return <HazardStripes color={color} opacity={theme.dark ? DEV_BAR.stripeAlpha.dark : DEV_BAR.stripeAlpha.light} />;
}
