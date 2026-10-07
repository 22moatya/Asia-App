"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="button button-secondary"
      onClick={() => void signOut({ callbackUrl: "/" })}
      type="button"
    >
      تسجيل الخروج
    </button>
  );
}
