import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Only available in development — remove before production
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const tenants = await prisma.tenant.findMany({ select: { slug: true, name: true } });
    const users = await prisma.user.findMany({ select: { email: true, role: true, tenantId: true } });
    return NextResponse.json({
      ok: true,
      database_url_set: !!process.env.DATABASE_URL,
      nextauth_url: process.env.NEXTAUTH_URL,
      tenants,
      users,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
