import assert from "node:assert/strict";
import test from "node:test";
import { sessionDeviceLabel } from "./session-device";

test("cihaz etiketi: mobil uygulama, tarayıcılar ve bilinmeyen", () => {
  assert.equal(sessionDeviceLabel("OnlineDershanemMobile/1.0.0 (ios)"), "Online Dershanem uygulaması · iOS");
  assert.equal(sessionDeviceLabel("OnlineDershanemMobile/1.2.3 (android)"), "Online Dershanem uygulaması · Android");
  assert.equal(sessionDeviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"), "Safari · macOS");
  assert.equal(sessionDeviceLabel("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0"), "Edge · Windows");
  assert.equal(sessionDeviceLabel("okhttp/4.12.0"), "Tarayıcı");
  assert.equal(sessionDeviceLabel(null), "Bilinmeyen cihaz");
});
