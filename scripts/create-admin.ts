import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { hashPassword } from "../lib/password";
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";

loadEnvConfig(process.cwd());

async function main() {
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL, and ADMIN_BOOTSTRAP_PASSWORD before creating an admin."
    );
  }
  if (
    password.length < 12 ||
    password.length > 128 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error(
      "The initial administrator password must be 12-128 characters and no more than 72 UTF-8 bytes."
    );
  }

  try {
    await connectDB();
    const existingUser = await User.findOne({ email }).select("_id").lean().exec();
    if (existingUser) {
      throw new Error(
        "An account with this email already exists; the setup script will not change existing accounts."
      );
    }

    await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: "admin",
    });
    console.log(`Administrator account created for ${email}.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Administrator setup failed.", error);
  process.exitCode = 1;
});
