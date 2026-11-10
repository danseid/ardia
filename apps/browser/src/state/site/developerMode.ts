import { isFields, isStringList } from "../../lib/decode";
import type { JsonSchema } from "../../lib/jsonSchema";

export type DeveloperMode = { enabledHosts: string[]; disabledDefaultHosts: string[]; hardReloadHosts: string[] };
export type DeveloperModeEnvironments = Record<string, string[]>;

export const NO_DEVELOPER_MODE: DeveloperMode = { enabledHosts: [], disabledDefaultHosts: [], hardReloadHosts: [] };

const HOST_LIST_KEYS = ["enabledHosts", "disabledDefaultHosts", "hardReloadHosts"] as const;

export const isDeveloperMode = (v: unknown): v is DeveloperMode => isFields(v) && HOST_LIST_KEYS.every((k) => isStringList(v[k]));

export const DEVELOPER_MODE_SCHEMA: JsonSchema = {
  type: "object",
  properties: Object.fromEntries(HOST_LIST_KEYS.map((k) => [k, { type: "array", items: { type: "string" } }])),
  required: [...HOST_LIST_KEYS],
};

export const isDeveloperEnvironments = (v: unknown): v is DeveloperModeEnvironments => isFields(v) && Object.values(v).every(isStringList);

export const DEVELOPER_ENVIRONMENTS_SCHEMA: JsonSchema = {
  type: "object",
  description: "Environment label to the host patterns it covers: example.com, *.example.com, localhost:3000.",
  additionalProperties: { type: "array", items: { type: "string" } },
};

type Site = { scheme: string; host: string; port: string };

const SITE = /^(https?):\/\/(?:[^/?#@]*@)?(\[[^\]]*\]|[^/?#:@]*)(?::(\d*))?(?:[/?#]|$)/i;

function siteOf(url: string): Site | null {
  const match = SITE.exec(url.trim());
  if (!match || !match[2]) return null;
  const host = match[2].toLowerCase().replace(/\.$/, "");
  return host ? { scheme: match[1]!.toLowerCase(), host, port: match[3] ?? "" } : null;
}

export const developerHostOf = (url: string): string => siteOf(url)?.host ?? "";

const octets = (host: string): number[] | null => {
  const parts = host.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p))) return null;
  const numbers = parts.map(Number);
  return numbers.every((n) => n <= 255) ? numbers : null;
};

const isPrivateIPv4 = ([a, b]: number[]) => a === 10 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168);

export function isDefaultDevSite({ host, port }: Pick<Site, "host" | "port">): boolean {
  if (host === "localhost" || host === "[::1]") return true;
  if (/\.(localhost|test|local)$/.test(host)) return true;
  const ip = octets(host);
  if (!ip) return false;
  return ip[0] === 127 || (port !== "" && isPrivateIPv4(ip));
}

export function isDefaultDevHost(url: string): boolean {
  const site = siteOf(url);
  return !!site && isDefaultDevSite(site);
}

export const canToggleDeveloperModeFor = (tab: { url: string; profileId: string } | undefined): boolean =>
  !!tab && !tab.profileId.startsWith("incognito:") && !!developerHostOf(tab.url);

type Setting = { developerMode: DeveloperMode };

export function developerModeOn(settings: Setting, url: string): boolean {
  const host = developerHostOf(url);
  if (!host) return false;
  const { enabledHosts, disabledDefaultHosts } = settings.developerMode;
  if (enabledHosts.includes(host)) return true;
  if (disabledDefaultHosts.includes(host)) return false;
  return isDefaultDevHost(url);
}

const toggled = (list: string[], host: string, present: boolean) => {
  const rest = list.filter((h) => h !== host);
  return present ? [...rest, host] : rest;
};

export function developerModeWith(current: DeveloperMode, url: string, on: boolean): DeveloperMode | null {
  const host = developerHostOf(url);
  if (!host) return null;
  const isDefault = isDefaultDevHost(url);
  return {
    ...current,
    enabledHosts: toggled(current.enabledHosts, host, on && !isDefault),
    disabledDefaultHosts: toggled(current.disabledDefaultHosts, host, !on && isDefault),
  };
}

export function hardReloadWith(current: DeveloperMode, url: string, hard: boolean): DeveloperMode | null {
  const host = developerHostOf(url);
  return host ? { ...current, hardReloadHosts: toggled(current.hardReloadHosts, host, hard) } : null;
}

export const hardReloadsOnReload = (settings: Setting, url: string): boolean =>
  developerModeOn(settings, url) && settings.developerMode.hardReloadHosts.includes(developerHostOf(url));

const DEFAULT_PORTS: Record<string, string> = { http: "80", https: "443" };

function patternMatches(pattern: string, site: Site): boolean {
  const [hostPattern, port] = pattern.trim().toLowerCase().split(/:(?=\d+$)/);
  if (!hostPattern) return false;
  if (port !== undefined && port !== (site.port || DEFAULT_PORTS[site.scheme])) return false;
  if (hostPattern.startsWith("*.")) return site.host.endsWith(hostPattern.slice(1)) && site.host.length > hostPattern.length - 1;
  return site.host === hostPattern;
}

export const LOCAL_ENVIRONMENT = "local";
export const ENVIRONMENT_LABEL_LENGTH = 12;

export function environmentLabel(environments: DeveloperModeEnvironments, url: string): string | null {
  const site = siteOf(url);
  if (!site) return null;
  for (const [label, patterns] of Object.entries(environments)) {
    if (patterns.some((p) => patternMatches(p, site))) return label.toLowerCase().slice(0, ENVIRONMENT_LABEL_LENGTH);
  }
  return isDefaultDevSite(site) ? LOCAL_ENVIRONMENT : null;
}

export type EnvironmentTone = "success" | "warning" | "destructive" | "neutral";

export function environmentTone(label: string): EnvironmentTone {
  if (label === "local") return "success";
  if (label === "staging") return "warning";
  if (label === "prod" || label === "production") return "destructive";
  return "neutral";
}
