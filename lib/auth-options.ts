import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validations";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          email: credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) {
          return null;
        }

        const [{ connectDB }, { verifyPassword }, { User }] =
          await Promise.all([
            import("@/lib/mongodb"),
            import("@/lib/password"),
            import("@/models/User"),
          ]);

        try {
          await connectDB();
          const user = await User.findOne({ email: parsed.data.email })
            .select("+password")
            .exec();

          if (!user || !user.isActive) {
            return null;
          }

          const passwordMatches = await verifyPassword(
            parsed.data.password,
            user.password
          );
          if (!passwordMatches) {
            return null;
          }

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Credentials authentication failed.", error);
          throw new Error("Authentication service is temporarily unavailable.");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        if (user.role === "admin" || user.role === "student") {
          token.role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role =
          token.role === "admin" || token.role === "student"
            ? token.role
            : "student";
      }
      return session;
    },
  },
};
