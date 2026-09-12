"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const ua = navigator.userAgent;
    const isIos =
      /iPad|iPhone|iPod/.test(ua) &&
      !(window as Window & { MSStream?: unknown }).MSStream;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIos(isIos && !standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !ios)) return null;

  const installApp = async () => {
    if (deferred) {
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
    } else if (ios) {
      setIosHelp(true);
    }
  };

  return (
    <>
      <button
        onClick={installApp}
        aria-label="تثبيت التطبيق"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-primary-700 px-4 py-2.5 text-sm font-black text-white shadow-lg ring-2 ring-white/60 transition hover:bg-primary-800"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
        تثبيت تطبيق A.N.T.E
      </button>

      {iosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-4"
          onClick={() => setIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-700 text-xl font-black text-white">
              A
            </span>
            <p className="mt-4 font-black text-ink-900">تثبيت تطبيق A.N.T.E</p>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              اضغط على زر المشاركة{" "}
              <span className="inline-block rounded bg-ink-100 px-1.5 py-0.5 align-middle text-xs" dir="ltr">
                ⎋
              </span>{" "}
              في المتصفح ثم اختر{" "}
              <b className="text-primary-700">«إضافة إلى الشاشة الرئيسية»</b>.
            </p>
            <button
              onClick={() => setIosHelp(false)}
              className="mt-5 w-full rounded-xl bg-primary-700 py-2.5 text-sm font-black text-white hover:bg-primary-800"
            >
              فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
}