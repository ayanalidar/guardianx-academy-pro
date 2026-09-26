import { NextResponse } from "next/server";

// Uses Prisma/Node APIs - pin the Node.js runtime explicitly.
export const runtime = "nodejs";


export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}