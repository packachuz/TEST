"use client";

import { useState, useEffect, useRef } from "react";
import { BookOpen, Plus, Send, Loader2, Link, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notebook {
  id: string;
  title: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function NotebookLMPage() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selected, setSelected] = useState<Notebook | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [newName, setNewName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [addingSource, setAddingSource] = useState(false);
  const [creatingNb, setCreatingNb] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    loadNotebooks();
  }, []);

  async function api(action: string, params: Record<string, string> = {}) {
    const res = await fetch("/api/notebooklm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, params }),
    });
    return res.json();
  }

  async function loadNotebooks() {
    setListLoading(true);
    setError("");
    const data = await api("list_notebooks");
    setListLoading(false);
    if (data.auth_required) { setAuthRequired(true); return; }
    if (data.error) { setError(data.error); return; }
    setNotebooks(data.notebooks ?? []);
  }

  async function createNotebook(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreatingNb(true);
    const data = await api("create_notebook", { name: newName.trim() });
    setCreatingNb(false);
    if (data.error) { setError(data.error); return; }
    const nb = { id: data.id, title: data.title };
    setNotebooks((prev) => [...prev, nb]);
    setSelected(nb);
    setMessages([]);
    setNewName("");
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !sourceUrl.trim()) return;
    setAddingSource(true);
    const data = await api("add_source", { notebook_id: selected.id, url: sourceUrl.trim() });
    setAddingSource(false);
    if (data.error) { setError(data.error); return; }
    setSourceUrl("");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `Source added and indexed. You can now ask questions about it.` },
    ]);
  }

  async function askQuestion(text: string) {
    if (!selected || !text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    const data = await api("ask", { notebook_id: selected.id, question: text.trim() });
    setLoading(false);
    const reply = data.error ? `Error: ${data.error}` : (data.answer ?? "No response.");
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
  }

  if (authRequired) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h2 className="mb-2 text-lg font-semibold text-gray-900">NotebookLM Authentication Required</h2>
          <p className="mb-4 text-sm text-gray-600">
            Run the following command in the terminal to log in with your Google account, then refresh this page.
          </p>
          <code className="block rounded-lg bg-gray-900 px-4 py-3 text-left text-sm text-green-400">
            notebooklm login
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Left panel — notebooks */}
      <div className="flex w-64 flex-col gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <h1 className="text-base font-semibold text-gray-900">NotebookLM</h1>
        </div>

        {/* Create notebook */}
        <form onSubmit={createNotebook} className="flex gap-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New notebook…"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newName.trim() || creatingNb}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creatingNb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </form>

        {/* Notebook list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {listLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : notebooks.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">No notebooks yet</p>
          ) : (
            notebooks.map((nb) => (
              <button
                key={nb.id}
                onClick={() => { setSelected(nb); setMessages([]); }}
                className={cn(
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  selected?.id === nb.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {nb.title}
              </button>
            ))
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* Right panel — chat */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
            <BookOpen className="mb-4 h-12 w-12 text-indigo-200" />
            <p className="text-sm text-gray-500">Select or create a notebook to get started</p>
          </div>
        ) : (
          <>
            {/* Notebook header + add source */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium text-gray-800">{selected.title}</span>
              <form onSubmit={addSource} className="ml-auto flex gap-2">
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Add source URL…"
                  className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!sourceUrl.trim() || addingSource}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addingSource ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link className="h-3 w-3" />}
                  Add
                </button>
              </form>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <p className="text-sm text-gray-400">Add a source URL, then ask questions about it</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-800 rounded-tl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Question input */}
            <div className="border-t border-gray-200 p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); askQuestion(question); }}
                className="flex gap-2"
              >
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about your sources…"
                  disabled={loading}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || loading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
