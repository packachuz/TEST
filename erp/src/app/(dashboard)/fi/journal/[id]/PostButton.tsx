"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PostButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePost() {
    if (!confirm("Post this journal entry? This cannot be undone.")) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/fi/journal/${entryId}/post`, { method: "POST" });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Failed to post entry");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handlePost} disabled={loading}>
        {loading ? "Posting..." : "Post Entry"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
