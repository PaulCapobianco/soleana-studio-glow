import { useEffect, useRef } from "react";

type TurnstileWidgetProps = {
  siteKey?: string;
  onTokenChange: (token: string | null) => void;
  onWidgetReady?: () => void;
  onError?: () => void;
  onExpire?: () => void;
};

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "unsupported-callback"?: () => void;
    },
  ) => string | number;
  reset: (widgetId: string | number) => void;
  remove?: (widgetId: string | number) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById("cf-turnstile-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("turnstile script error")));
        return;
      }

      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("turnstile script error"));
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

export function TurnstileWidget({
  siteKey,
  onTokenChange,
  onWidgetReady,
  onError,
  onExpire,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const callbacksRef = useRef({
    onTokenChange,
    onWidgetReady,
    onError,
    onExpire,
  });

  callbacksRef.current = {
    onTokenChange,
    onWidgetReady,
    onError,
    onExpire,
  };

  useEffect(() => {
    let cancelled = false;

    callbacksRef.current.onTokenChange(null);

    if (!siteKey || !containerRef.current) {
      return undefined;
    }
    // Narrowing a function parameter (`siteKey?: string`) doesn't carry
    // into a nested function's closure, even after this guard — capture it
    // in a local const so TypeScript can see it's definitely a string below.
    const resolvedSiteKey = siteKey;

    async function renderWidget() {
      try {
        await loadTurnstileScript();

        if (cancelled || !containerRef.current || !window.turnstile) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: resolvedSiteKey,
          theme: "light",
          callback: (token: string) => {
            callbacksRef.current.onTokenChange(token);
          },
          "error-callback": () => {
            callbacksRef.current.onTokenChange(null);
            callbacksRef.current.onError?.();
          },
          "expired-callback": () => {
            callbacksRef.current.onTokenChange(null);
            callbacksRef.current.onExpire?.();
          },
          "unsupported-callback": () => {
            callbacksRef.current.onTokenChange(null);
            callbacksRef.current.onError?.();
          },
        });

        callbacksRef.current.onWidgetReady?.();
      } catch {
        callbacksRef.current.onTokenChange(null);
        callbacksRef.current.onError?.();
      }
    }

    renderWidget();

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  if (!siteKey) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#E8DCCF] bg-[#FAF6EF] p-5 text-sm text-muted-foreground">
        La vérification anti-spam n&apos;est pas encore configurée.
      </div>
    );
  }

  return <div ref={containerRef} className="overflow-hidden rounded-[20px]" />;
}
