import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validations";
import { User } from "@/models/User";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Registration details are invalid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  try {
    await connectDB();
    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: await hashPassword(parsed.data.password),
      role: "student",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully.",
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    console.error("Student registration failed.", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the account right now." },
      { status: 500 }
    );
  }
}
