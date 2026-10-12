"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, isAuthed } from "@/lib/auth";

/**
 * Avela is just a web app — there is no marketing landing page. People reach it
 * via social links, the sitemap, or an invite link. The root route sends them
 * straight into the app: the dashboard when signed in, otherwise login.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const signedIn = isAuthed() || !!getSession().email;
    router.replace(signedIn ? "/events" : "/login");
  }, [router]);

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
