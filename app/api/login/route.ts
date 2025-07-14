import { NextRequest, NextResponse } from "next/server";
import { generateMockUser } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const validPassword = process.env.NEXT_PUBLIC_LOGIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password !== validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Use generateMockUser from utils
    const mockUser = generateMockUser();

    const dummyToken = "dummy-token";
    return NextResponse.json(
      { token: dummyToken, user: mockUser },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
