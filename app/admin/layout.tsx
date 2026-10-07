import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/login");
  }

  await connectDB();
  const user = await User.findById(userId).select("role isActive").lean().exec();
  if (!user?.isActive || user.role !== "admin") {
    redirect("/");
  }

  return children;
}
