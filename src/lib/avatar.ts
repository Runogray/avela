/* ------------------------------------------------------------------ *
 * Avela — profile avatars. A fixed set of 8 illustrated avatars
 * (4 female, 4 male, from Figma 14581:26507). The user picks one on the
 * Profile screen; the choice is stored as an id in dote.auth.avatar and
 * shown everywhere the current user's avatar appears.
 * ------------------------------------------------------------------ */

export type AvatarGender = "female" | "male";
export type Avatar = { id: string; src: string; gender: AvatarGender; label: string };

export const AVATARS: Avatar[] = [
  { id: "female-1", src: "/dote/avatars/female-1.png", gender: "female", label: "Avatar 1" },
  { id: "female-2", src: "/dote/avatars/female-2.png", gender: "female", label: "Avatar 2" },
  { id: "female-3", src: "/dote/avatars/female-3.png", gender: "female", label: "Avatar 3" },
  { id: "female-4", src: "/dote/avatars/female-4.png", gender: "female", label: "Avatar 4" },
  { id: "male-1", src: "/dote/avatars/male-1.png", gender: "male", label: "Avatar 5" },
  { id: "male-2", src: "/dote/avatars/male-2.png", gender: "male", label: "Avatar 6" },
  { id: "male-3", src: "/dote/avatars/male-3.png", gender: "male", label: "Avatar 7" },
  { id: "male-4", src: "/dote/avatars/male-4.png", gender: "male", label: "Avatar 8" },
];

export const DEFAULT_AVATAR_ID = "female-2";

/** Broadcast so every mounted <UserAvatar> refreshes without a reload. */
export const AVATAR_EVENT = "dote:avatar";

export function avatarSrc(id: string | undefined | null): string {
  const found = AVATARS.find((a) => a.id === id);
  return (found ?? AVATARS.find((a) => a.id === DEFAULT_AVATAR_ID)!).src;
}

/** The current user's avatar id from dote.auth, falling back to a gender-aware default. */
export function currentAvatarId(): string {
  try {
    const a = JSON.parse(localStorage.getItem("dote.auth") || "{}");
    if (a.avatar && AVATARS.some((x) => x.id === a.avatar)) return a.avatar as string;
    const g = (a.gender || "").toLowerCase();
    if (g.startsWith("male")) return "male-1";
    if (g.startsWith("female")) return "female-1";
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_AVATAR_ID;
}

/* --- first-run onboarding: prompt for an avatar on the dashboard --- */
const ONBOARD_KEY = "dote.onboardAvatar";

/** Flag a freshly-created account so the dashboard pops the avatar picker. */
export function markAvatarOnboarding() {
  try {
    localStorage.setItem(ONBOARD_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

/** Whether the dashboard should prompt the user to choose an avatar. */
export function needsAvatarOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARD_KEY) === "1";
  } catch {
    return false;
  }
}

/** Clear the onboarding flag once the prompt has been shown/answered. */
export function clearAvatarOnboarding() {
  try {
    localStorage.removeItem(ONBOARD_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** Persist the chosen avatar id and notify listeners. */
export function setAvatarId(id: string) {
  try {
    const a = JSON.parse(localStorage.getItem("dote.auth") || "{}");
    a.avatar = id;
    localStorage.setItem("dote.auth", JSON.stringify(a));
  } catch {
    /* storage unavailable */
  }
  try {
    window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: id }));
  } catch {
    /* no window */
  }
}
