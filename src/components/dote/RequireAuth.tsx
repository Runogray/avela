"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, isAuthed } from "@/lib/auth";
import { SIGNED_OUT_EVENT, TOKEN_KEY } from "@/lib/api";

function signedIn() {
  // Same rule as `/`: an API token, or the mock session used when the backend is down.
  return isAuthed() || !!getSession().email;
}

/**
 * Gate for host-only routes. Signed-out visitors (including someone pressing
 * Back after logging out) are sent to /login. Also reacts to a logout in
 * another tab and to the API rejecting a revoked/expired token.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const check = () => {
      if (signedIn()) setOk(true);
      else {
        setOk(false);
        router.replace("/login");
      }
    };
    check();
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === TOKEN_KEY || e.key === "dote.auth") check();
    };
    // bfcache restores (Back button) skip effects, so re-check on pageshow too.
    const onPageShow = (e: PageTransitionEvent) => e.persisted && check();
    window.addEventListener("storage", onStorage);
    window.addEventListener(SIGNED_OUT_EVENT, check);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SIGNED_OUT_EVENT, check);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  if (!ok) {
    return (
      <div className="grid min-h-screen place-items-center bg-white">
        <span
          className="h-8 w-8 animate-spin rounded-full border-[3px] border-teal/25 border-t-teal"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }
  return <>{children}</>;
}
