"use client";

import { useEffect, useState } from "react";
import { AVATAR_EVENT, avatarSrc, currentAvatarId } from "@/lib/avatar";

/* The current user's avatar. Reads the chosen id from dote.auth and keeps
 * in sync across the app via the AVATAR_EVENT custom event + storage events. */
export function UserAvatar({ className = "", alt = "" }: { className?: string; alt?: string }) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(currentAvatarId());
    const refresh = () => setId(currentAvatarId());
    window.addEventListener(AVATAR_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AVATAR_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Render the default on the server / first paint to avoid a hydration flash,
  // then swap to the stored choice once mounted.
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={avatarSrc(id)} alt={alt} className={className} />
  );
}
