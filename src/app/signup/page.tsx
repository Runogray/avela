import type { Metadata } from "next";
import { AuthScreen } from "@/components/dote/AuthScreen";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return <AuthScreen initialMode="create" />;
}
