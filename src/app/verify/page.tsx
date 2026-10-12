import type { Metadata } from "next";
import { VerifyEmail } from "@/components/dote/VerifyEmail";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return <VerifyEmail email={email} />;
}
