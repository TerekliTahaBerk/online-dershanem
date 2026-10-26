"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { applicationClick, GA_CONSENT_DAYS, GA_CONSENT_KEY, googleAnalyticsPath, googleAnalyticsReferrer, googleAnalyticsUrl, readGoogleAnalyticsConsent } from "@/lib/google-analytics-policy";
import styles from "./google-analytics.module.css";

type Choice = "granted" | "denied";
type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag; }
}

const CHANGE_EVENT = "od-ga-consent-change";
const denied = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
function consentSnapshot() {
  try { return readGoogleAnalyticsConsent(localStorage.getItem(GA_CONSENT_KEY)); }
  catch { return "unset" as const; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
function disableTag(id: string, disabled: boolean) {
  (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled;
}
function clearGoogleCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    if (!/^_ga(?:_|$)/.test(name)) continue;
    const domains = ["", `; Domain=${location.hostname}`, "; Domain=onlinedershanem.com"];
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
  }
}

/** Basic consent: no Google tag or requests until the visitor explicitly opts in. */
export function GoogleAnalytics({ id, nonce }: { id: string; nonce?: string }) {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribe, consentSnapshot, () => "pending" as const);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [sessionDenied, setSessionDenied] = useState(false);
  const revoked = useRef(false);
  const lastPage = useRef<string | null>(null);
  const initialized = useRef(false);
  const publicPath = googleAnalyticsPath(pathname);
  const enabled = /^G-[A-Z0-9]+$/.test(id);

  function choose(next: Choice) {
    if (next === "denied") {
      revoked.current = true;
      setSessionDenied(true);
      disableTag(id, true);
      window.gtag?.("consent", "update", denied);
      clearGoogleCookies();
    }
    let saved = false;
    try {
      localStorage.setItem(GA_CONSENT_KEY, JSON.stringify({ choice: next, expiresAt: Date.now() + GA_CONSENT_DAYS * 86_400_000 }));
      saved = true;
      if (next === "granted") {
        revoked.current = false;
        setSessionDenied(false);
      }
      setStorageError(false);
      setEditing(false);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch { setStorageError(true); }
    // Unload the SDK on withdrawal, including its automatic engagement timers.
    if (saved && next === "denied" && initialized.current) window.location.reload();
  }

  function initialize() {
    if (initialized.current || revoked.current || consentSnapshot() !== "granted" || !googleAnalyticsPath(location.pathname)) return;
    window.dataLayer ??= [];
    // gtag's queue consumes Arguments messages, rather than GTM event arrays.
    // eslint-disable-next-line prefer-rest-params
    window.gtag ??= function () { window.dataLayer!.push(arguments); };
    window.gtag("consent", "default", denied);
    window.gtag("consent", "update", { ...denied, analytics_storage: "granted" });
    window.gtag("set", { allow_google_signals: false, allow_ad_personalization_signals: false });
    window.gtag("js", new Date());
    window.gtag("config", id, {
      send_page_view: false,
      page_location: googleAnalyticsUrl(location.origin, location.pathname),
      page_referrer: googleAnalyticsReferrer(document.referrer),
      page_title: `onlinedershanem. ${location.pathname}`,
      cookie_expires: GA_CONSENT_DAYS * 86_400,
    });
    initialized.current = true;
    setReady(true);
  }

  useEffect(() => {
    const allowed = choice === "granted" && !sessionDenied && Boolean(publicPath);
    disableTag(id, !allowed);
    if (!allowed) {
      lastPage.current = null;
      if (initialized.current && choice !== "granted") {
        clearGoogleCookies();
        window.location.reload();
      }
      return;
    }
    if (!ready || lastPage.current === publicPath) return;
    lastPage.current = publicPath;
    window.gtag?.("set", { page_location: googleAnalyticsUrl(location.origin, publicPath!), page_referrer: googleAnalyticsReferrer(document.referrer), page_title: `onlinedershanem. ${publicPath}` });
    window.gtag?.("event", "page_view", {
      send_to: id,
      page_location: googleAnalyticsUrl(location.origin, publicPath!),
      page_referrer: googleAnalyticsReferrer(document.referrer),
      page_title: `onlinedershanem. ${publicPath}`,
    });
  }, [choice, publicPath, id, ready, sessionDenied]);

  useEffect(() => {
    if (!ready || choice !== "granted" || sessionDenied || !publicPath) return;
    function onClick(event: MouseEvent) {
      if (revoked.current || consentSnapshot() !== "granted" || !googleAnalyticsPath(location.pathname) || !(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (!anchor || !applicationClick(anchor.getAttribute("href") ?? "")) return;
      window.gtag?.("event", "application_click", {
        send_to: id, page_path: googleAnalyticsPath(location.pathname), form_id: "QK6MYp",
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [choice, publicPath, ready, id, sessionDenied]);

  if (!enabled) return null;
  return <>
    {choice === "granted" && !sessionDenied && publicPath ? <Script id="od-ga4" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" nonce={nonce} onReady={initialize} /> : null}
    {publicPath && choice !== "pending" ? <>
      {choice === "unset" || editing ? <section className={styles.banner} aria-label="Google Analytics tercihi">
        <strong>Google Analytics ölçümüne izin verir misin?</strong>
        <p>İzin verirsen herkese açık sayfaların kullanımını ve başvuru bağlantısı tıklamalarını Google Analytics ile ölçeriz. Reddedersen bu Google etiketi yüklenmez. Tercihini buradan değiştirebilirsin. <Link href="/gizlilik">Gizlilik açıklaması</Link></p>
        {storageError ? <p role="alert">Tercihin kaydedilemedi. Google Analytics bu sayfada kapalı; tercihini saklamak için tarayıcı depolamasını kontrol et.</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={() => choose("denied")}>Reddet</button>
          <button type="button" onClick={() => choose("granted")}>İzin ver</button>
          {editing && choice !== "unset" ? <button type="button" onClick={() => setEditing(false)}>Kapat</button> : null}
        </div>
      </section> : <button className={styles.preference} type="button" onClick={() => setEditing(true)}>Google Analytics tercihi</button>}
    </> : null}
  </>;
}
