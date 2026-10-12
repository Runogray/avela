import type { Metadata } from "next";
import { AuthScreen } from "@/components/dote/AuthScreen";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <AuthScreen initialMode="login" />;
}
