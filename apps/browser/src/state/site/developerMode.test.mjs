import assert from "node:assert/strict";
import { test } from "node:test";
const dm = await import("./developerMode.ts");
const { useBrowser } = await import("../browser/store.ts");
const { setDeveloperMode, toggleDeveloperMode, setAlwaysHardReload } = await import("./developerModeActions.ts");
const { DEFAULT_SETTINGS, parseSettings, SETTING_SPECS } = await import("../settings/settings.ts");

const S = () => useBrowser.getState();

test("default dev hosts", () => {
  for (const url of [
    "http://localhost",
    "http://localhost:8123/path?x=1",
    "HTTPS://LOCALHOST:3000",
    "http://127.0.0.1",
    "http://127.5.5.5:80",
    "http://[::1]:5173",
    "http://app.localhost",
    "http://shop.test/x",
    "http://printer.local",
    "http://10.0.0.1:3000",
    "http://172.16.0.1:80",
    "http://172.31.255.255:1",
    "http://192.168.1.5:8080",
    "https://user:pw@localhost:3000/",
    "http://localhost.:3000/",
    "http://app.localhost./",
  ]) {
    assert.equal(dm.isDefaultDevHost(url), true, url);
  }
});

test("everything else is not a default dev host", () => {
  for (const url of [
    "https://example.com",
    "http://192.168.1.5",
    "http://10.0.0.1",
    "http://172.32.0.1:80",
    "http://172.15.0.1:80",
    "http://8.8.8.8:80",
    "http://notlocalhost",
    "http://localhost.example.com",
    "http://testing.com",
    "file:///x",
    "about:blank",
    "chrome://version",
    "ardia://settings",
    "",
  ]) {
    assert.equal(dm.isDefaultDevHost(url), false, url);
  }
});

test("the toggle key is the lowercase host without the port", () => {
  assert.equal(dm.developerHostOf("http://LocalHost:8123/a"), "localhost");
  assert.equal(dm.developerHostOf("http://[::1]:5173/"), "[::1]");
  assert.equal(dm.developerHostOf("http://localhost.:3000/"), "localhost");
  assert.equal(dm.developerHostOf("http://example.com./a"), "example.com");
  assert.equal(dm.developerHostOf("http://./a"), "");
  assert.equal(dm.developerHostOf("file:///x"), "");
  assert.equal(dm.developerHostOf(""), "");
});

const none = () => ({ developerMode: { enabledHosts: [], disabledDefaultHosts: [], hardReloadHosts: [] } });

test("developerModeOn follows the lists, then the default rule", () => {
  assert.equal(dm.developerModeOn(none(), "http://localhost:3000"), true);
  assert.equal(dm.developerModeOn(none(), "https://example.com"), false);
  assert.equal(dm.developerModeOn(none(), "file:///x"), false);
  const settings = { developerMode: { enabledHosts: ["example.com"], disabledDefaultHosts: ["localhost"], hardReloadHosts: [] } };
  assert.equal(dm.developerModeOn(settings, "https://example.com/a"), true);
  assert.equal(dm.developerModeOn(settings, "http://localhost:3000"), false);
});

test("toggling transitions never leave a host in both lists", () => {
  let current = none().developerMode;
  current = dm.developerModeWith(current, "http://localhost:3000", false);
  assert.deepEqual(current.disabledDefaultHosts, ["localhost"]);
  assert.deepEqual(current.enabledHosts, []);
  current = dm.developerModeWith(current, "http://localhost:3000", true);
  assert.deepEqual(current.disabledDefaultHosts, []);
  assert.deepEqual(current.enabledHosts, []);
  current = dm.developerModeWith(current, "https://example.com", true);
  assert.deepEqual(current.enabledHosts, ["example.com"]);
  current = dm.developerModeWith(current, "https://example.com", true);
  assert.deepEqual(current.enabledHosts, ["example.com"]);
  current = dm.developerModeWith(current, "https://example.com", false);
  assert.deepEqual(current, none().developerMode);
  const both = { enabledHosts: ["192.168.1.5"], disabledDefaultHosts: ["192.168.1.5"], hardReloadHosts: [] };
  const fixed = dm.developerModeWith(both, "http://192.168.1.5:80", true);
  assert.deepEqual(fixed.enabledHosts, []);
  assert.deepEqual(fixed.disabledDefaultHosts, []);
  assert.equal(dm.developerModeWith(none().developerMode, "file:///x", true), null);
});

test("the validator accepts the shape and rejects others", () => {
  assert.ok(dm.isDeveloperMode(none().developerMode));
  assert.ok(!dm.isDeveloperMode({ enabledHosts: [] }));
  assert.ok(!dm.isDeveloperMode({ enabledHosts: [1], disabledDefaultHosts: [], hardReloadHosts: [] }));
  assert.ok(!dm.isDeveloperMode([]));
  assert.ok(!dm.isDeveloperMode(null));
  assert.ok(dm.isDeveloperEnvironments({ staging: ["a.com"] }));
  assert.ok(!dm.isDeveloperEnvironments({ staging: "a.com" }));
  assert.equal(SETTING_SPECS.developerMode.synced, true);
  assert.equal(SETTING_SPECS.developerModeEnvironments.synced, false);
  assert.deepEqual(parseSettings({ developerMode: { enabledHosts: 4 } }).developerMode, DEFAULT_SETTINGS.developerMode);
  assert.deepEqual(parseSettings({ developerModeEnvironments: { prod: ["a.com"] } }).developerModeEnvironments, { prod: ["a.com"] });
});

test("environment patterns: exact, wildcard, port, first match wins, default dev host is local", () => {
  const envs = {
    staging: ["*.staging.example.com", "stage.example.com:8443"],
    prod: ["example.com", "www.example.com", "*.example.com"],
    Local3000: ["localhost:3000"],
  };
  const label = (url) => dm.environmentLabel(envs, url);
  assert.equal(label("https://example.com/x"), "prod");
  assert.equal(label("https://WWW.Example.com"), "prod");
  assert.equal(label("https://api.staging.example.com"), "staging");
  assert.equal(label("https://staging.example.com"), "prod");
  assert.equal(label("https://stage.example.com:8443"), "staging");
  assert.equal(label("https://stage.example.com"), "prod");
  assert.equal(label("http://localhost:3000"), "local3000");
  assert.equal(label("http://localhost:3001"), "local");
  assert.equal(label("https://other.org"), null);
  assert.equal(label("file:///x"), null);
  assert.equal(dm.environmentLabel({}, "http://app.test"), "local");
  assert.equal(dm.environmentLabel({ averyveryverylonglabel: ["a.com"] }, "https://a.com"), "averyveryver");
  assert.equal(dm.environmentLabel({ first: ["a.com"], second: ["a.com"] }, "https://a.com"), "first");
  assert.equal(dm.environmentLabel({ web: ["a.com:443"] }, "https://a.com"), "web");
});

test("badge tones", () => {
  assert.equal(dm.environmentTone("local"), "success");
  assert.equal(dm.environmentTone("staging"), "warning");
  assert.equal(dm.environmentTone("prod"), "destructive");
  assert.equal(dm.environmentTone("production"), "destructive");
  assert.equal(dm.environmentTone("qa"), "neutral");
});

test("hard reload applies only while Developer Mode is on for the host", () => {
  const settings = { developerMode: { enabledHosts: [], disabledDefaultHosts: [], hardReloadHosts: ["localhost", "example.com"] } };
  assert.equal(dm.hardReloadsOnReload(settings, "http://localhost:3000"), true);
  assert.equal(dm.hardReloadsOnReload(settings, "https://example.com"), false);
  assert.equal(dm.hardReloadsOnReload(none(), "http://localhost:3000"), false);
  const next = dm.hardReloadWith(none().developerMode, "http://localhost:3000", true);
  assert.deepEqual(next.hardReloadHosts, ["localhost"]);
  assert.deepEqual(dm.hardReloadWith(next, "http://localhost:9", false).hardReloadHosts, []);
});

const setup = (profile) => {
  S().hydrate({});
  const w = S().createWindow(profile ? { url: "http://localhost:3000/", kind: "private" } : { url: "http://localhost:3000/" });
  return S().windows[w].tabIds[0];
};

test("the toggle writes through settings for a normal window", () => {
  const id = setup(false);
  toggleDeveloperMode(id);
  assert.deepEqual(S().settings.developerMode.disabledDefaultHosts, ["localhost"]);
  toggleDeveloperMode(id);
  assert.deepEqual(S().settings.developerMode.disabledDefaultHosts, []);
  S().updateTab(id, { url: "https://example.com/", title: "" }, {});
  setDeveloperMode(id, true);
  assert.deepEqual(S().settings.developerMode.enabledHosts, ["example.com"]);
  setAlwaysHardReload(id, true);
  assert.deepEqual(S().settings.developerMode.hardReloadHosts, ["example.com"]);
  setDeveloperMode(id, false);
  assert.deepEqual(S().settings.developerMode.enabledHosts, []);
});

test("a private window never persists a host", () => {
  const id = setup(true);
  const before = S().settings.developerMode;
  toggleDeveloperMode(id);
  setDeveloperMode(id, false);
  setAlwaysHardReload(id, true);
  assert.deepEqual(S().settings.developerMode, before);
  assert.equal(dm.developerModeOn(S().settings, S().tabs[id].url), true);
});
