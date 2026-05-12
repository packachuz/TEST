import { spawn } from "child_process";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const SCRIPT = path.resolve(process.cwd(), "../scripts/notebooklm_client.py");

type Action = "list_notebooks" | "create_notebook" | "add_source" | "ask";

interface Payload {
  action: Action;
  params?: Record<string, string>;
}

function runPython(payload: Payload): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const arg = JSON.stringify(payload);
    const proc = spawn("python3", [SCRIPT, arg]);

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", () => {
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ error: stderr.trim() || "Python script returned no output" });
      }
    });

    proc.on("error", (err: Error) => {
      resolve({ error: `Failed to start Python: ${err.message}` });
    });
  });
}

const ALLOWED_ACTIONS: Action[] = ["list_notebooks", "create_notebook", "add_source", "ask"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Partial<Payload>;
  const { action, params = {} } = body;

  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  if (action === "create_notebook" && typeof params.name !== "string") {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (action === "add_source") {
    if (typeof params.notebook_id !== "string" || typeof params.url !== "string") {
      return NextResponse.json({ error: "notebook_id and url required" }, { status: 400 });
    }
    try { new URL(params.url); } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }
  if (action === "ask") {
    if (typeof params.notebook_id !== "string" || typeof params.question !== "string") {
      return NextResponse.json({ error: "notebook_id and question required" }, { status: 400 });
    }
    if (params.question.length > 2000) {
      return NextResponse.json({ error: "Question too long (max 2000 chars)" }, { status: 400 });
    }
  }

  const result = await runPython({ action, params });
  return NextResponse.json(result);
}
