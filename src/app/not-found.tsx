import Link from "next/link";
import { DoteLogo } from "@/components/dote/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFEF7] px-6 text-center font-dote">
      <DoteLogo />
      <h1 className="font-dote text-[24px] font-medium tracking-[-0.6px] text-[#1c1611]">
        This page floated away.
      </h1>
      <p className="max-w-[40ch] text-[15px] text-[#5c5c5c]">
        The link may be old, or the host may have taken the page down.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-[50px] bg-teal px-6 py-3 text-[14px] font-medium text-teal-ink transition hover:brightness-95"
      >
        Back to Avela
      </Link>
    </main>
  );
}
