import { useBrowser } from "../browser/store";
import { canToggleDeveloperModeFor, developerModeOn, environmentLabel, hardReloadsOnReload } from "./developerMode";

export const useDeveloperModeOn = (tabId: string): boolean => useBrowser((s) => developerModeOn(s.settings, s.tabs[tabId]?.url ?? ""));

export const useAlwaysHardReload = (tabId: string): boolean => useBrowser((s) => hardReloadsOnReload(s.settings, s.tabs[tabId]?.url ?? ""));

export const useCanToggleDeveloperMode = (tabId: string): boolean => useBrowser((s) => canToggleDeveloperModeFor(s.tabs[tabId]));

export const useEnvironmentLabel = (tabId: string): string | null => useBrowser((s) => environmentLabel(s.settings.developerModeEnvironments, s.tabs[tabId]?.url ?? ""));
