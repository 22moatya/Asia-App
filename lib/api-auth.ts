import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/mongodb";
import { User, type UserRole } from "@/models/User";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

type Authenticated = { error: null; user: AuthenticatedUser };
type AuthenticationError = { error: NextResponse; user: null };
export type AuthResult = Authenticated | AuthenticationError;

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  await connectDB();
  const user = await User.findById(userId)
    .select("name email role isActive")
    .lean()
    .exec();
  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function requireAuth(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
      user: null,
    };
  }
  return { error: null, user };
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) {
    return result;
  }
  if (result.user.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, message: "Administrator access required." },
        { status: 403 }
      ),
      user: null,
    };
  }
  return result;
}
