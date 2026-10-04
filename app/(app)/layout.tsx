import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Backdrop from "@/components/Backdrop";
import { getCurrentSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentSession();
  if (!user) redirect("/login");
  return (
    <div className="relative flex min-h-screen flex-col text-slate-900 md:flex-row">
      <Backdrop />
      <Sidebar userName={user.name} userRole={user.role} />
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
