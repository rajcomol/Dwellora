import { redirect } from "next/navigation";

/** `/` is handled by `src/proxy.ts` (session → dashboard or login). This is a safe fallback. */
export default function Home() {
  redirect("/login");
}
