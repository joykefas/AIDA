"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Sparkles,
  BookOpen,
  Layers,
  Search,
  Plus,
  ChevronDown,
  Check,
  CheckCheck,
  ThumbsUp,
  ThumbsDown,
  Copy,
  FileText,
  Headphones,
  Video,
  ArrowLeft,
  X,
  RefreshCw,
  Sliders,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadSheet } from "@/components/upload-sheet";
import { clientFetch } from "@/lib/api-client";
import type { DocumentListItem, TutorChatMessage, TutorThreadSummary } from "@aida/shared";
import { cn } from "cn";

type ThreadFilterType = "all" | "active" | "pdf" | "audio" | "youtube";

const FILTER_TABS: { id: ThreadFilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "With Chats" },
  { id: "pdf", label: "PDFs" },
  { id: "audio", label: "Audio" },
  { id: "youtube", label: "YouTube" },
];

let localMsgCounter = 0;
function getNextLocalId(): string {
  localMsgCounter += 1;
  return `local-msg-${localMsgCounter}`;
}

export function WhatsAppTutorView() {
  const searchParams = useSearchParams();
  const initialDocParam = searchParams.get("documentId");

  // Thread list state
  const [threads, setThreads] = useState<TutorThreadSummary[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadSearch, setThreadSearch] = useState("");
  const [threadFilter, setThreadFilter] = useState<ThreadFilterType>("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  // Active conversation state
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocParam);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mobile view toggle (conversation list vs chat view)
  const [mobileChatOpen, setMobileChatOpen] = useState(Boolean(initialDocParam));

  // Sync state when URL param changes
  const [prevParam, setPrevParam] = useState(initialDocParam);
  if (initialDocParam !== prevParam) {
    setPrevParam(initialDocParam);
    if (initialDocParam !== null) {
      setSelectedDocId(initialDocParam);
      setMobileChatOpen(true);
    }
  }

  // Messages state
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [simplify, setSimplify] = useState(false);
  const [feedbackPopover, setFeedbackPopover] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load threads
  const fetchThreads = useCallback(() => {
    return clientFetch<TutorThreadSummary[]>("/tutor/threads")
      .then((data) => {
        setThreads(data);
        if (selectedDocId === undefined && data.length > 0) {
          const firstRealDoc = data.find((t) => t.documentId !== null);
          setSelectedDocId(firstRealDoc ? firstRealDoc.documentId : null);
        }
      })
      .catch(() => {
        // Fallback: fetch from /documents
        clientFetch<DocumentListItem[]>("/documents")
          .then((docs) => {
            const fallbackThreads: TutorThreadSummary[] = [
              {
                documentId: null,
                title: "General AI Tutor (All Materials)",
                type: null,
                status: "READY",
                createdAt: "",
                topics: [],
                lastMessage: null,
                messageCount: 0,
              },
              ...docs.map((d) => ({
                documentId: d.id,
                title: d.title,
                type: d.type,
                status: d.status,
                createdAt: d.createdAt,
                topics: [],
                lastMessage: null,
                messageCount: 0,
              })),
            ];
            setThreads(fallbackThreads);
          })
          .catch(() => {});
      })
      .finally(() => {
        setLoadingThreads(false);
      });
  }, [selectedDocId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleRefreshThreads = () => {
    setLoadingThreads(true);
    fetchThreads();
  };

  // Close topic dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTopicDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Find active thread
  const activeThread = useMemo(() => {
    return (
      threads.find((t) => t.documentId === selectedDocId) ?? {
        documentId: selectedDocId,
        title: selectedDocId ? "Selected Material" : "General AI Tutor",
        type: null,
        status: "READY",
        createdAt: "",
        topics: [],
        lastMessage: null,
        messageCount: 0,
      }
    );
  }, [threads, selectedDocId]);

  // Load messages for selected document and topic
  useEffect(() => {
    let ignore = false;
    let url = "/tutor/history";
    const params = new URLSearchParams();
    if (selectedDocId) {
      params.set("documentId", selectedDocId);
    }
    if (selectedTopicId) {
      params.set("topicId", selectedTopicId);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    clientFetch<TutorChatMessage[]>(url)
      .then((data) => {
        if (!ignore) setMessages(data);
      })
      .catch(() => {
        if (!ignore) setMessages([]);
      })
      .finally(() => {
        if (!ignore) setLoadingMessages(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedDocId, selectedTopicId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Filtered threads for left pane
  const filteredThreads = useMemo(() => {
    let result = threads;
    if (threadSearch.trim()) {
      const q = threadSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.lastMessage?.content.toLowerCase().includes(q) ||
          t.topics.some((top) => top.title.toLowerCase().includes(q)),
      );
    }
    if (threadFilter === "pdf") {
      result = result.filter((t) => t.type === "PDF");
    } else if (threadFilter === "audio") {
      result = result.filter((t) => t.type === "AUDIO");
    } else if (threadFilter === "youtube") {
      result = result.filter((t) => t.type === "YOUTUBE");
    } else if (threadFilter === "active") {
      result = result.filter((t) => t.messageCount > 0);
    }
    return result;
  }, [threads, threadSearch, threadFilter]);

  // Filtered visible messages in active chat
  const visibleMessages = useMemo(() => {
    if (!selectedTopicId) return messages;
    return messages.filter((m) => m.topicId === selectedTopicId || !m.topicId);
  }, [messages, selectedTopicId]);

  // Send message
  async function handleSend(customText?: string) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || sending) return;

    setSending(true);
    const tempId = getNextLocalId();
    const userMsg: TutorChatMessage = {
      id: tempId,
      role: "user",
      content: textToSend,
      documentId: selectedDocId ?? undefined,
      topicId: selectedTopicId ?? undefined,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await clientFetch<{
        id: string;
        answer: string;
        citations: TutorChatMessage["citations"];
        createdAt: string;
      }>("/tutor", {
        method: "POST",
        body: JSON.stringify({
          message: textToSend,
          documentId: selectedDocId ?? undefined,
          topicId: selectedTopicId ?? undefined,
          simplify,
        }),
      });

      const assistantMsg: TutorChatMessage = {
        id: res.id,
        role: "assistant",
        content: res.answer,
        documentId: selectedDocId ?? undefined,
        topicId: selectedTopicId ?? undefined,
        citations: res.citations,
        createdAt: res.createdAt,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Update thread last message in state
      setThreads((prev) =>
        prev.map((t) =>
          t.documentId === selectedDocId
            ? {
                ...t,
                lastMessage: {
                  content: res.answer,
                  role: "assistant",
                  createdAt: res.createdAt,
                },
                messageCount: t.messageCount + 2,
              }
            : t,
        ),
      );
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: getNextLocalId(),
          role: "assistant",
          content: "Sorry, I ran into an error generating an answer. Please verify your connection and try again.",
          documentId: selectedDocId ?? undefined,
          topicId: selectedTopicId ?? undefined,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  // Rate message
  async function handleRate(messageId: string, rating: "HELPFUL" | "UNHELPFUL", feedback?: string) {
    if (messageId.startsWith("local-")) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, rating } : msg)),
    );
    setFeedbackPopover(null);
    setFeedbackText("");
    try {
      await clientFetch(`/tutor/messages/${messageId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating, feedbackText: feedback }),
      });
    } catch {}
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper for Doc Icon
  const getDocIcon = (type: string | null) => {
    switch (type) {
      case "PDF":
        return <FileText className="size-4 text-rose-500" />;
      case "AUDIO":
        return <Headphones className="size-4 text-purple-500" />;
      case "YOUTUBE":
        return <Video className="size-4 text-red-500" />;
      default:
        return <Sparkles className="size-4 text-brand-500" />;
    }
  };

  const getDocAvatarBg = (type: string | null) => {
    switch (type) {
      case "PDF":
        return "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400";
      case "AUDIO":
        return "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400";
      case "YOUTUBE":
        return "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400";
      default:
        return "bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400";
    }
  };

  // Format time (e.g. 20:47 or May 12)
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const activeTopicObj = activeThread.topics.find((t) => t.id === selectedTopicId);

  return (
    <div className="flex h-[calc(100svh-5.5rem)] w-full rounded-2xl border border-border bg-card shadow-lg shadow-black/5 overflow-hidden">
      {/* ─── LEFT PANE: Conversation List (WhatsApp Style) ─────────────────────────── */}
      <aside
        className={cn(
          "w-full md:w-80 lg:w-[360px] shrink-0 border-r border-border flex flex-col bg-card/70 backdrop-blur-md",
          mobileChatOpen ? "hidden md:flex" : "flex",
        )}
      >
        {/* Left Header */}
        <div className="h-16 px-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="font-heading text-base font-bold tracking-tight">AIDA Tutor</h1>
              <p className="text-[11px] text-muted-foreground">Material Conversations</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-xs font-semibold rounded-lg border-border hover:border-brand-500/40"
              title="Add new study material"
            >
              <Plus className="size-3.5 text-brand-600" />
              <span>New Material</span>
            </Button>
            <button
              type="button"
              onClick={handleRefreshThreads}
              title="Refresh conversation list"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn("size-3.5", loadingThreads && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/60 bg-card/40 flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search or start a new chat…"
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40 border-border/60 focus-visible:bg-background"
            />
            {threadSearch && (
              <button
                type="button"
                onClick={() => setThreadSearch("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 text-[11px]">
            {FILTER_TABS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setThreadFilter(f.id)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-medium whitespace-nowrap transition-colors",
                  threadFilter === f.id
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-muted/60 hover:bg-muted text-muted-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/30">
          {loadingThreads && threads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="size-5 animate-spin text-brand-600" />
              <span>Loading your study conversations…</span>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <BookOpen className="mx-auto size-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-foreground">No conversations found</p>
              <p className="mt-1">Upload a PDF or lecture recording to start learning with your AI Tutor.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUploadOpen(true)}
                className="mt-4 text-xs"
              >
                Upload First Document
              </Button>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedDocId === thread.documentId;
              const hasLastMessage = Boolean(thread.lastMessage);

              return (
                <div
                  key={thread.documentId ?? "general"}
                  onClick={() => {
                    setSelectedDocId(thread.documentId);
                    setSelectedTopicId(null);
                    setLoadingMessages(true);
                    setMobileChatOpen(true);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-all select-none relative",
                    isSelected
                      ? "bg-accent/80 border-l-4 border-l-brand-600 dark:bg-muted/60"
                      : "hover:bg-muted/40",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform",
                      getDocAvatarBg(thread.type),
                      isSelected && "scale-105 ring-2 ring-brand-500/30",
                    )}
                  >
                    {getDocIcon(thread.type)}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold leading-tight",
                          isSelected ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {thread.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {formatTime(thread.lastMessage?.createdAt ?? thread.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-xs">
                      <p className="truncate text-xs text-muted-foreground flex items-center gap-1">
                        {hasLastMessage ? (
                          <>
                            {thread.lastMessage?.role === "user" && (
                              <CheckCheck className="size-3 text-brand-600 shrink-0 inline" />
                            )}
                            <span className="truncate">{thread.lastMessage?.content}</span>
                          </>
                        ) : thread.topics.length > 0 ? (
                          <span className="italic text-muted-foreground/75">
                            {thread.topics.length} topics ready · Click to chat
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/75">Start a study conversation…</span>
                        )}
                      </p>

                      {thread.topics.length > 0 && (
                        <span className="shrink-0 rounded-full bg-muted/80 px-2 py-0.2 text-[10px] font-medium text-muted-foreground">
                          {thread.topics.length} tpc
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ─── RIGHT PANE: Active Conversation & Topic Filter (WhatsApp Style) ──────── */}
      <main
        className={cn(
          "flex-1 flex-col h-full bg-background relative overflow-hidden",
          mobileChatOpen ? "flex" : "hidden md:flex",
        )}
      >
        {/* Top Header Bar */}
        <header className="h-16 px-4 border-b border-border bg-card/90 flex items-center justify-between gap-3 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile back button */}
            <button
              type="button"
              onClick={() => setMobileChatOpen(false)}
              className="md:hidden flex size-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>

            {/* Document Avatar */}
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                getDocAvatarBg(activeThread.type),
              )}
            >
              {getDocIcon(activeThread.type)}
            </div>

            {/* Document Title & Subtitle */}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate leading-tight">{activeThread.title}</h2>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">
                  {activeThread.documentId ? "Grounded in your material" : "General study mode"}
                  {activeThread.topics.length > 0 && ` · ${activeThread.topics.length} topics`}
                </span>
              </div>
            </div>
          </div>

          {/* Right Controls: Topic Dropdown Filter */}
          <div className="flex items-center gap-2">
            {activeThread.topics && activeThread.topics.length > 0 && (
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setTopicDropdownOpen((o) => !o)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-accent select-none",
                    selectedTopicId && "border-brand-500/60 bg-brand-50/50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300",
                    topicDropdownOpen && "ring-2 ring-brand-500/20",
                  )}
                >
                  <Layers className="size-3.5 text-brand-600 shrink-0" />
                  <span className="hidden sm:inline text-muted-foreground font-normal">Topic:</span>
                  <span className="max-w-[140px] sm:max-w-[180px] truncate font-semibold">
                    {selectedTopicId ? activeTopicObj?.title : "All Topics"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3 text-muted-foreground transition-transform duration-150",
                      topicDropdownOpen && "rotate-180",
                    )}
                  />
                </button>

                {topicDropdownOpen && (
                  <div className="absolute right-0 z-50 mt-1.5 w-72 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl shadow-black/20 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Differentiate Topic In Material
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(null);
                        setLoadingMessages(true);
                        setTopicDropdownOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors",
                        selectedTopicId === null
                          ? "bg-brand-500/10 text-brand-600 font-semibold dark:text-brand-400"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span className="truncate">📚 All Topics in Material</span>
                      {selectedTopicId === null && <Check className="size-3.5 text-brand-500 shrink-0" />}
                    </button>

                    <div className="-mx-1 my-1 h-px bg-border/60" />

                    <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
                      {activeThread.topics.map((t) => {
                        const isSelected = selectedTopicId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTopicId(t.id);
                              setLoadingMessages(true);
                              setTopicDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs font-medium transition-colors",
                              isSelected
                                ? "bg-brand-500/10 text-brand-600 font-semibold dark:text-brand-400"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <span className="truncate pr-2">📌 {t.title}</span>
                            {isSelected && <Check className="size-3.5 text-brand-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Active Topic Filter Notification Bar */}
        {selectedTopicId && activeTopicObj && (
          <div className="bg-brand-50/80 dark:bg-brand-950/40 border-b border-brand-200 dark:border-brand-900/50 px-4 py-1.5 text-xs flex items-center justify-between gap-2 text-brand-900 dark:text-brand-200">
            <div className="flex items-center gap-1.5 truncate">
              <Layers className="size-3.5 text-brand-600 shrink-0" />
              <span>
                Filtered to Topic: <strong className="font-semibold">{activeTopicObj.title}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTopicId(null);
                setLoadingMessages(true);
              }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 shrink-0 underline"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* ─── Chat Body: Messages Thread (WhatsApp Style) ─────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"
        >
          {loadingMessages ? (
            <div className="m-auto text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="size-5 animate-spin text-brand-600" />
              <span>Loading messages for this material…</span>
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="m-auto max-w-md text-center p-6 rounded-2xl border border-border/80 bg-card/90 shadow-sm backdrop-blur-sm">
              <div className="size-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="size-6" />
              </div>
              <h3 className="font-heading text-base font-semibold">Start your study session</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Ask your personal AI Tutor anything about{" "}
                <strong className="text-foreground">{activeThread.title}</strong>. Answers are strictly
                grounded in your material.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  "Can you summarize this material?",
                  "What are the most important concepts?",
                  "Give me a real-world example",
                  "Quiz me on key points",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
                >
                  {/* WhatsApp-Style User Message Bubble (Right) */}
                  {isUser ? (
                    <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-xs bg-[#005c4b] dark:bg-[#005c4b] text-[#e9edef] px-4 py-2.5 shadow-sm text-sm break-words relative">
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-200/80">
                        <span>{formatTime(msg.createdAt)}</span>
                        <CheckCheck className="size-3 text-cyan-300" />
                      </div>
                    </div>
                  ) : (
                    /* WhatsApp-Style AI Tutor Message Bubble (Left) */
                    <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                      <div className="size-8 shrink-0 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold shadow-xs mt-0.5">
                        <Sparkles className="size-4" />
                      </div>

                      <div className="rounded-2xl rounded-tl-xs bg-[#202c33] dark:bg-[#202c33] text-[#e9edef] border border-[#2a3942]/60 px-4 py-3 shadow-sm text-sm break-words flex flex-col gap-2 relative">
                        {/* Header inside tutor bubble */}
                        <div className="flex items-center justify-between gap-2 border-b border-[#2a3942] pb-1.5 text-xs">
                          <span className="font-semibold text-brand-400 flex items-center gap-1">
                            AIDA Tutor
                          </span>
                          {msg.topicId && (
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                              📌 Topic Grasp
                            </span>
                          )}
                        </div>

                        {/* Markdown Content */}
                        <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-[#e9edef]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>

                        {/* Citations / Grounded Sources */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-2 rounded-xl bg-black/30 p-2.5 text-xs border border-white/5">
                            <span className="font-semibold text-brand-300 block mb-1 text-[11px] uppercase tracking-wider">
                              📎 Grounded Citations ({msg.citations.length})
                            </span>
                            <div className="flex flex-col gap-1 text-[11px] text-slate-300">
                              {msg.citations.map((c, i) => (
                                <div key={i} className="truncate">
                                  • <strong className="text-white">{c.topicTitle}</strong>:{" "}
                                  <span className="italic opacity-80">&quot;{c.excerpt}&quot;</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer & Actions */}
                        <div className="mt-1 flex items-center justify-between border-t border-[#2a3942] pt-2 text-[11px] text-slate-400">
                          {/* Helpful Rating Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRate(msg.id, "HELPFUL")}
                              className={cn(
                                "flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors",
                                msg.rating === "HELPFUL" && "text-emerald-400 font-bold bg-white/10",
                              )}
                              title="Helpful"
                            >
                              <ThumbsUp className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFeedbackPopover(msg.id)}
                              className={cn(
                                "flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors",
                                msg.rating === "UNHELPFUL" && "text-rose-400 font-bold bg-white/10",
                              )}
                              title="Not helpful / report issue"
                            >
                              <ThumbsDown className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="rounded px-1.5 py-0.5 hover:bg-white/10 transition-colors"
                              title="Copy answer"
                            >
                              {copiedId === msg.id ? (
                                <Check className="size-3 text-emerald-400" />
                              ) : (
                                <Copy className="size-3" />
                              )}
                            </button>
                          </div>

                          {/* Time */}
                          <span className="text-[10px] opacity-75">{formatTime(msg.createdAt)}</span>
                        </div>

                        {/* Feedback Popover */}
                        {feedbackPopover === msg.id && (
                          <div className="mt-2 rounded-xl border border-white/10 bg-black/60 p-3 flex flex-col gap-2">
                            <p className="text-xs font-medium text-white">How can the AI Tutor improve this answer?</p>
                            <textarea
                              rows={2}
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="e.g. didn't explain the formula, was too vague…"
                              className="w-full rounded-lg bg-white/10 p-2 text-xs text-white placeholder:text-slate-400 outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setFeedbackPopover(null)}
                                className="h-6 text-xs text-slate-300"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleRate(msg.id, "UNHELPFUL", feedbackText)}
                                className="h-6 text-xs bg-rose-600 hover:bg-rose-700"
                              >
                                Submit
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {sending && (
            <div className="flex items-start gap-2.5 max-w-[80%]">
              <div className="size-8 shrink-0 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                <Sparkles className="size-4" />
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-[#202c33] dark:bg-[#202c33] border border-[#2a3942]/60 px-4 py-3 shadow-sm flex items-center gap-2">
                <span className="text-xs text-slate-300 font-medium">AIDA Tutor is thinking</span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="size-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="size-1.5 rounded-full bg-brand-400 animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2 border-t border-border/40 bg-card/60 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-muted-foreground font-semibold text-[10px] uppercase shrink-0">Prompts:</span>
          {[
            { label: "💡 Key takeaways", text: "What are the main takeaways from this material?" },
            { label: "❓ Quiz me", text: "Generate 3 quick practice questions to test my understanding." },
            { label: "🔍 Explain simply", text: "Explain this in simple terms using a relatable analogy." },
            { label: "📊 Step-by-step logic", text: "Walk me through the logical steps in detail." },
          ].map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => handleSend(prompt.text)}
              className="rounded-full border border-border bg-background/80 hover:bg-accent px-3 py-1 font-medium whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* ─── Input Footer Bar (WhatsApp Style) ─────────────────────────────────── */}
        <footer className="p-3 sm:px-4 border-t border-border bg-card/90 flex items-end gap-2.5 backdrop-blur-md">
          {/* Simplify Button Toggle */}
          <button
            type="button"
            onClick={() => setSimplify(!simplify)}
            className={cn(
              "size-10 shrink-0 rounded-xl border flex items-center justify-center transition-all",
              simplify
                ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
            title={simplify ? "Simplification mode ON" : "Turn on simpler explanations"}
          >
            <Sliders className="size-4" />
          </button>

          {/* Textarea Input Container */}
          <div className="flex-1 rounded-2xl bg-muted/50 border border-border/80 px-4 py-2 flex items-center focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Ask anything about ${activeThread.title}…`}
              className="w-full bg-transparent text-sm resize-none outline-none max-h-32 text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            disabled={!input.trim() || sending}
            onClick={() => handleSend()}
            aria-label="Send message"
            className={cn(
              "size-10 shrink-0 rounded-full flex items-center justify-center transition-all shadow-sm",
              input.trim() && !sending
                ? "bg-brand-600 hover:bg-brand-700 text-white active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
            )}
          >
            <Send className="size-4.5" />
          </button>
        </footer>
      </main>

      {/* Upload Sheet Modal for adding new material from Tutor */}
      {uploadOpen && (
        <UploadSheet
          onUploaded={() => {
            setUploadOpen(false);
            handleRefreshThreads();
          }}
        />
      )}
    </div>
  );
}
