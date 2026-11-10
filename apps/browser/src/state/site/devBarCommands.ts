import type { BrowserCommand } from "../../platform/commands";
import { currentTab } from "../browser/current";
import { runCommand } from "../commands/commands";

export function runDevBarCommand(tabId: string, command: BrowserCommand) {
  const tab = currentTab(tabId);
  if (tab) runCommand({ command, arg: null, windowId: tab.windowId }, { tabId });
}
