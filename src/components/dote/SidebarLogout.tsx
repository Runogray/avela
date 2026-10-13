"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";

/** Desktop sidebar "Logout": revokes the API token, clears the local session, goes to /login. */
export function SidebarLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    await logout(); // POST /auth/logout/ + clear dote.token / dote.auth
    router.replace("/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="mt-[60px] flex items-center gap-3 px-[18px] py-4 text-left text-[12px] font-medium text-[#616161] transition hover:text-[#1c1611] disabled:opacity-60"
    >
      <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      {busy ? "Logging out…" : "Logout"}
    </button>
  );
}
