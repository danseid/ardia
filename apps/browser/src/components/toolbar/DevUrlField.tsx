import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput } from "react-native";
import { ContextMenuArea, font, monoFamily, OutsidePressArea, Text, useTheme } from "../ui";
import type { ToolbarPalette } from "../ui/toolbarColors";
import { navigateFromDevBar } from "../../state/site/developerModeActions";
import { useToolbarRow } from "./useToolbarRow";

const ESCAPE = [{ key: "Escape" }];
const LINE_HEIGHT = 16;
const CHAR_WIDTH = 7.224;
const INPUT_INSET = 2;
const EDITOR_SLACK = 8;
const OVERHANG = EDITOR_SLACK - 1;

type Props = { tabId: string; url: string; palette: ToolbarPalette; onFocus: () => void; onContextMenu?: () => void };

export function DevUrlField({ tabId, url, palette, onFocus, onContextMenu }: Props) {
  const [editing, setEditing] = useState(false);
  const row = useToolbarRow();
  const type = { fontFamily: monoFamily, fontSize: font.small.fontSize, lineHeight: LINE_HEIGHT };

  if (!editing) {
    return (
      <ContextMenuArea style={{ flexShrink: 1, minWidth: 0 }} onContextMenu={onContextMenu}>
        <Pressable
          onPress={() => {
            onFocus();
            setEditing(true);
          }}
          tooltip="Edit URL"
          style={{ minWidth: 0, justifyContent: "center", height: row.field }}
        >
          <Text numberOfLines={1} ellipsizeMode="tail" color={palette.text} style={type}>
            {url}
          </Text>
        </Pressable>
      </ContextMenuArea>
    );
  }

  return <DevUrlEditor tabId={tabId} url={url} palette={palette} typeStyle={type} onDone={() => setEditing(false)} />;
}

function DevUrlEditor({ tabId, url, palette, typeStyle, onDone }: { tabId: string; url: string; palette: ToolbarPalette; typeStyle: object; onDone: () => void }) {
  const theme = useTheme();
  const row = useToolbarRow();
  const [text, setText] = useState(url);
  const input = useRef<TextInput>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      input.current?.focus();
      input.current?.setSelection(0, url.length);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <OutsidePressArea onOutsidePress={onDone} style={{ flexShrink: 1, minWidth: 0, width: Math.max(text.length, url.length) * CHAR_WIDTH + EDITOR_SLACK, marginRight: -OVERHANG, height: row.field, justifyContent: "center" }}>
      <TextInput
        ref={input}
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => {
          navigateFromDevBar(tabId, text);
          onDone();
        }}
        onBlur={onDone}
        keyDownEvents={ESCAPE}
        onKeyDown={(e) => {
          if (e.nativeEvent.key === "Escape") onDone();
        }}
        autoCorrect={false}
        spellCheck={false}
        enableFocusRing={false}
        selectionColor={theme.selection}
        style={[typeStyle, { color: palette.text, padding: 0, margin: 0, height: LINE_HEIGHT, left: -INPUT_INSET, top: -1 }]}
      />
    </OutsidePressArea>
  );
}
