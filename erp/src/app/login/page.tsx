"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const tenantSlug = (form.elements.namedItem("tenantSlug") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      tenantSlug,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid credentials. Please check your company slug, email, and password.");
      return;
    }

    router.push(result.url ?? "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">HR & Payroll ERP</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Company Slug"
              name="tenantSlug"
              type="text"
              placeholder="e.g. demo"
              required
              autoComplete="organization"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="admin@demo.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 rounded-md bg-blue-50 p-3 text-xs text-blue-700">
            <p className="font-medium">Demo credentials:</p>
            <p>Slug: <strong>demo</strong> · Email: <strong>admin@demo.com</strong> · Password: <strong>demo1234</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
