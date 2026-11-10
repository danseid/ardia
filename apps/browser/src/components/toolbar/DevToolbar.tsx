import { useMemo, useState, type ReactNode } from "react";
import { Animated, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from "react-native";
import { useTab } from "../../state/browser/hooks";
import { runDevBarCommand } from "../../state/site/devBarCommands";
import { environmentTone, type EnvironmentTone } from "../../state/site/developerMode";
import { useEnvironmentLabel } from "../../state/site/hooks";
import { useShortcutHint, withShortcut } from "../../state/commands/commandShortcuts";
import { activate } from "../../state/tabs/actions";
import { Button, Divider, space, Text, useTheme, WindowDragRegion, withAlpha } from "../ui";
import { useEasedColor, type ToolbarPalette } from "../ui/toolbarColors";
import { DevStripes } from "./HazardStripes";
import { DevUrlField } from "./DevUrlField";
import { DEV_BAR } from "./tokens";
import { useSitePalette } from "./useSitePalette";
import { useToolbarRow } from "./useToolbarRow";

function EnvironmentBadge({ tabId }: { tabId: string }) {
  const theme = useTheme();
  const label = useEnvironmentLabel(tabId);
  if (!label) return null;
  const tone: EnvironmentTone = environmentTone(label);
  const ink = tone === "neutral" ? theme.textSecondary : theme[tone];
  return (
    <View
      style={{
        height: DEV_BAR.badgeHeight,
        paddingHorizontal: space.s,
        borderRadius: DEV_BAR.badgeHeight / 2,
        justifyContent: "center",
        backgroundColor: tone === "neutral" ? theme.rowHover : withAlpha(ink, DEV_BAR.badgeFillAlpha),
      }}
    >
      <Text size="tiny" weight="semibold" color={ink} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function DevButtons({ tabId, palette, onFocus, width }: { tabId: string; palette: ToolbarPalette; onFocus: () => void; width: number }) {
  const copyHint = useShortcutHint("copyUrl");
  const reloadHint = useShortcutHint("forceReload");
  const toolsHint = useShortcutHint("devTools");
  const consoleHint = useShortcutHint("javaScriptConsole");
  const inspectHint = useShortcutHint("inspectElements");
  const run = (command: "copyUrl" | "forceReload" | "devTools" | "javaScriptConsole" | "inspectElements") => () => {
    onFocus();
    runDevBarCommand(tabId, command);
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Button variant="icon" toolbar palette={palette} icon="link" look="field" onPress={run("copyUrl")} tooltip={withShortcut("Copy URL", copyHint)} />
      <Button variant="icon" toolbar palette={palette} icon="arrow.clockwise" look="field" onPress={run("forceReload")} tooltip={withShortcut("Hard Reload", reloadHint)} />
      {width >= DEV_BAR.showTools && <Button variant="icon" toolbar palette={palette} icon="hammer" look="field" onPress={run("devTools")} tooltip={withShortcut("Open Developer Tools", toolsHint)} />}
      {width >= DEV_BAR.showConsole && (
        <>
          <Button variant="icon" toolbar palette={palette} icon="doc.text" look="field" onPress={run("javaScriptConsole")} tooltip={withShortcut("JavaScript Console", consoleHint)} />
          <Button variant="icon" toolbar palette={palette} icon="cursorarrow" look="field" onPress={run("inspectElements")} tooltip={withShortcut("Inspect Elements", inspectHint)} />
        </>
      )}
    </View>
  );
}

export function DevBarContent({
  tabId,
  palette,
  onFocus,
  leading,
  trailing,
  onContextMenu,
}: {
  tabId: string;
  palette: ToolbarPalette;
  onFocus: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  onContextMenu?: () => void;
}) {
  const url = useTab(tabId, (t) => t?.url ?? "");
  const row = useToolbarRow();
  const [width, setWidth] = useState(Infinity);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: DEV_BAR.urlGap, height: row.field, paddingLeft: leading ? 0 : space.m, overflow: "hidden" }}
    >
      {leading}
      <DevUrlField key={tabId} tabId={tabId} url={url} palette={palette} onFocus={onFocus} onContextMenu={onContextMenu} />
      <EnvironmentBadge tabId={tabId} />
      <View pointerEvents="box-none" style={{ flex: 1 }} />
      <DevButtons tabId={tabId} palette={palette} onFocus={onFocus} width={width} />
      {trailing}
    </View>
  );
}

export function DevToolbarField({
  tabId,
  palette,
  style,
  onFocus,
  leading,
  trailing,
  onContextMenu,
}: {
  tabId: string;
  palette: ToolbarPalette;
  style: ViewStyle;
  onFocus: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  onContextMenu?: () => void;
}) {
  const row = useToolbarRow();
  return (
    <View pointerEvents="box-none" style={[style, { flexDirection: "row", alignItems: "center", height: row.field }]}>
      <DevBarContent tabId={tabId} palette={palette} onFocus={onFocus} leading={leading} trailing={trailing} onContextMenu={onContextMenu} />
    </View>
  );
}

export function DevBar({ tabId, focused }: { tabId: string; focused: boolean }) {
  const palette = useSitePalette(tabId);
  const band = useEasedColor(palette.background);
  const row = useToolbarRow();
  const focus = useMemo(() => () => activate(tabId), [tabId]);
  return (
    <View style={{ height: row.height }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: band }]} />
      <DevStripes tabId={tabId} />
      <WindowDragRegion style={StyleSheet.absoluteFill} />
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: space.m, top: row.center - row.field / 2, height: row.field, flexDirection: "row" }}>
        <DevBarContent tabId={tabId} palette={palette} onFocus={focused ? noop : focus} />
      </View>
      <Divider color={palette.divider} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }} />
    </View>
  );
}

const noop = () => undefined;
