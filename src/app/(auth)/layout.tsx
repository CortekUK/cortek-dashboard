import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (user) redirect("/");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.primary/0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,theme(colors.primary/0.10),transparent_60%)]" />
      </div>
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
