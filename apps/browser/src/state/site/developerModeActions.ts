import { currentSettings, currentTab } from "../browser/current";
import { updateSettings } from "../settings/actions";
import { resolveTyped } from "../settings/settings";
import { openFromBar } from "../omnibox/openFromBar";
import { canToggleDeveloperModeFor, developerModeOn, developerModeWith, hardReloadWith } from "./developerMode";

export function canToggleDeveloperMode(tabId: string): boolean {
  return canToggleDeveloperModeFor(currentTab(tabId));
}

export function setDeveloperMode(tabId: string, on: boolean) {
  const tab = currentTab(tabId);
  if (!tab || !canToggleDeveloperMode(tabId)) return;
  const next = developerModeWith(currentSettings().developerMode, tab.url, on);
  if (next) updateSettings({ developerMode: next });
}

export function toggleDeveloperMode(tabId: string) {
  const tab = currentTab(tabId);
  if (tab) setDeveloperMode(tabId, !developerModeOn(currentSettings(), tab.url));
}

export function setAlwaysHardReload(tabId: string, hard: boolean) {
  const tab = currentTab(tabId);
  if (!tab || !canToggleDeveloperMode(tabId)) return;
  const next = hardReloadWith(currentSettings().developerMode, tab.url, hard);
  if (next) updateSettings({ developerMode: next });
}

export function navigateFromDevBar(tabId: string, text: string) {
  const url = resolveTyped(currentSettings(), text);
  if (url) openFromBar(url, tabId, "current");
}
