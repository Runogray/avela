import { RequireAuth } from "@/components/dote/RequireAuth";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
