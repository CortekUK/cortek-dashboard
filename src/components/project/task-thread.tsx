"use client"

import * as React from "react"
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Paperclip,
  Send,
  Smile,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteTaskComment,
  insertTaskComment,
  listTaskComments,
  type TaskComment,
} from "@/lib/task-comments-db"
import {
  createCommentAttachments,
  listCommentAttachments,
  uploadCommentFile,
  type CommentAttachment,
} from "@/lib/task-comment-attachments-db"
import {
  addCommentReaction,
  listCommentReactions,
  QUICK_REACTIONS,
  removeCommentReaction,
  type CommentReaction,
} from "@/lib/task-comment-reactions-db"

const AUTHOR_KEY = "cortek.commentAuthor"
const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function MonoAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase()
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  )
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day === 1) return "yesterday"
  if (day < 7) return `${day} days ago`
  const wk = Math.round(day / 7)
  if (wk < 4) return `${wk}w ago`
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isImageUrl(url: string): boolean {
  return IMG_RE.test(url)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

type ReactionGroup = {
  emoji: string
  count: number
  authors: string[]
  mine: boolean
}

function groupReactions(
  reactions: CommentReaction[],
  me: string
): ReactionGroup[] {
  const map = new Map<string, ReactionGroup>()
  for (const r of reactions) {
    const g = map.get(r.emoji)
    if (g) {
      g.count += 1
      g.authors.push(r.author)
      if (r.author === me) g.mine = true
    } else {
      map.set(r.emoji, {
        emoji: r.emoji,
        count: 1,
        authors: [r.author],
        mine: r.author === me,
      })
    }
  }
  return Array.from(map.values())
}

/** All comments transitively descending from rootId, in chronological order. */
function descendantsOf(
  rootId: string,
  comments: TaskComment[]
): TaskComment[] {
  const childrenByParent = new Map<string, TaskComment[]>()
  for (const c of comments) {
    if (c.parentId) {
      const arr = childrenByParent.get(c.parentId) ?? []
      arr.push(c)
      childrenByParent.set(c.parentId, arr)
    }
  }
  const out: TaskComment[] = []
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    const kids = childrenByParent.get(id) ?? []
    for (const k of kids) {
      out.push(k)
      stack.push(k.id)
    }
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

// ──────────────────────────────────────────────────────────────────────
// Top-level thread view (root messages only)
// ──────────────────────────────────────────────────────────────────────

export function TaskThread({ taskId }: { taskId: string }) {
  const [comments, setComments] = React.useState<TaskComment[]>([])
  const [attachments, setAttachments] = React.useState<CommentAttachment[]>([])
  const [reactions, setReactions] = React.useState<CommentReaction[]>([])
  const [loading, setLoading] = React.useState(true)
  const [author, setAuthor] = React.useState("")
  const [openThreadId, setOpenThreadId] = React.useState<string | null>(null)
  const [justAddedId, setJustAddedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    listTaskComments(taskId).then(async (rows) => {
      if (cancelled) return
      setComments(rows)
      const ids = rows.map((c) => c.id)
      const [atts, rxs] = await Promise.all([
        listCommentAttachments(ids),
        listCommentReactions(ids),
      ])
      if (cancelled) return
      setAttachments(atts)
      setReactions(rxs)
      setLoading(false)
    })
    try {
      const saved = window.localStorage.getItem(AUTHOR_KEY)
      if (saved) setAuthor(saved)
    } catch {}
    return () => {
      cancelled = true
    }
  }, [taskId])

  React.useEffect(() => {
    if (author.trim()) {
      try {
        window.localStorage.setItem(AUTHOR_KEY, author.trim())
      } catch {}
    }
  }, [author])

  const me = author.trim() || "Anonymous"

  const attsByComment = React.useMemo(() => {
    const map = new Map<string, CommentAttachment[]>()
    for (const a of attachments) {
      const arr = map.get(a.commentId) ?? []
      arr.push(a)
      map.set(a.commentId, arr)
    }
    return map
  }, [attachments])

  const rxByComment = React.useMemo(() => {
    const map = new Map<string, CommentReaction[]>()
    for (const r of reactions) {
      const arr = map.get(r.commentId) ?? []
      arr.push(r)
      map.set(r.commentId, arr)
    }
    return map
  }, [reactions])

  const roots = React.useMemo(
    () =>
      comments
        .filter((c) => c.parentId === null)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [comments]
  )

  const replyCountByRoot = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of roots) {
      map.set(r.id, descendantsOf(r.id, comments).length)
    }
    return map
  }, [roots, comments])

  const openRoot = React.useMemo(
    () => (openThreadId ? roots.find((r) => r.id === openThreadId) ?? null : null),
    [openThreadId, roots]
  )
  const openDescendants = React.useMemo(
    () => (openRoot ? descendantsOf(openRoot.id, comments) : []),
    [openRoot, comments]
  )

  async function postMessage(
    body: string,
    parentId: string | null,
    staged: StagedAttachment[]
  ): Promise<TaskComment | null> {
    const trimmed = body.trim()
    if (!trimmed && staged.length === 0) return null
    const created = await insertTaskComment({
      taskId,
      parentId,
      author: me,
      body: trimmed || "(attachment)",
    })
    setComments((prev) => [...prev, created])
    setJustAddedId(created.id)
    window.setTimeout(() => setJustAddedId(null), 800)

    if (staged.length > 0) {
      const atts = await createCommentAttachments(
        staged.map((s, i) => ({
          commentId: created.id,
          url: s.url,
          label: s.label,
          position: i,
        }))
      )
      setAttachments((prev) => [...prev, ...atts])
    }
    return created
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this message and all its replies?")) return
    await deleteTaskComment(id)
    const toRemove = new Set<string>()
    const collect = (cid: string) => {
      toRemove.add(cid)
      for (const c of comments) if (c.parentId === cid) collect(c.id)
    }
    collect(id)
    setComments((prev) => prev.filter((c) => !toRemove.has(c.id)))
    setAttachments((prev) => prev.filter((a) => !toRemove.has(a.commentId)))
    setReactions((prev) => prev.filter((r) => !toRemove.has(r.commentId)))
    if (openThreadId && toRemove.has(openThreadId)) setOpenThreadId(null)
  }

  async function handleToggleReaction(commentId: string, emoji: string) {
    const existing = reactions.find(
      (r) => r.commentId === commentId && r.emoji === emoji && r.author === me
    )
    if (existing) {
      setReactions((prev) => prev.filter((r) => r.id !== existing.id))
      await removeCommentReaction({ commentId, emoji, author: me })
    } else {
      const created = await addCommentReaction({
        commentId,
        emoji,
        author: me,
      })
      if (created) setReactions((prev) => [...prev, created])
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MonoAvatar name={me} size={24} />
          <Label
            htmlFor="thread-author"
            className="text-xs text-muted-foreground"
          >
            Posting as
          </Label>
          <Input
            id="thread-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Your name"
            className="h-7 max-w-[180px] border-transparent bg-transparent px-1 text-sm focus-visible:border-border focus-visible:bg-background"
          />
        </div>
        {comments.length > 0 && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {comments.length} {comments.length === 1 ? "message" : "messages"}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : roots.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
          No messages yet — start the conversation below.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {roots.map((root) => (
            <RootRow
              key={root.id}
              comment={root}
              attachments={attsByComment.get(root.id) ?? []}
              reactions={rxByComment.get(root.id) ?? []}
              replyCount={replyCountByRoot.get(root.id) ?? 0}
              me={me}
              justAdded={justAddedId === root.id}
              onOpen={() => setOpenThreadId(root.id)}
              onDelete={() => handleDelete(root.id)}
              onToggleReaction={(emoji) => handleToggleReaction(root.id, emoji)}
            />
          ))}
        </ul>
      )}

      <Composer
        taskId={taskId}
        placeholder="Start a new message…"
        onSubmit={async (body, staged) => {
          await postMessage(body, null, staged)
        }}
      />

      {/* Side sheet for one thread */}
      <Sheet
        open={openThreadId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenThreadId(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md md:max-w-xl"
        >
          {openRoot && (
            <ThreadSheetBody
              root={openRoot}
              rootAttachments={attsByComment.get(openRoot.id) ?? []}
              rootReactions={rxByComment.get(openRoot.id) ?? []}
              replies={openDescendants}
              attsByComment={attsByComment}
              rxByComment={rxByComment}
              me={me}
              taskId={taskId}
              justAddedId={justAddedId}
              onDelete={handleDelete}
              onToggleReaction={handleToggleReaction}
              onReplySubmit={async (body, staged) => {
                await postMessage(body, openRoot.id, staged)
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────────
// One root message in the main view (preview + click-to-open)
// ──────────────────────────────────────────────────────────────────────

function RootRow({
  comment,
  attachments,
  reactions,
  replyCount,
  me,
  justAdded,
  onOpen,
  onDelete,
  onToggleReaction,
}: {
  comment: TaskComment
  attachments: CommentAttachment[]
  reactions: CommentReaction[]
  replyCount: number
  me: string
  justAdded: boolean
  onOpen: () => void
  onDelete: () => void
  onToggleReaction: (emoji: string) => void
}) {
  const reactionGroups = groupReactions(reactions, me)

  function stop(e: React.MouseEvent) {
    e.stopPropagation()
  }

  return (
    <li>
      <article
        onClick={onOpen}
        className={`group/row cursor-pointer rounded-lg border bg-card/50 px-3 py-2.5 transition-colors hover:bg-card hover:border-border/80 ${
          justAdded ? "cortek-fade-in" : ""
        }`}
      >
        <div className="flex gap-3">
          <MonoAvatar name={comment.author} size={28} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <header className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{comment.author}</span>
                <time
                  dateTime={comment.createdAt}
                  title={new Date(comment.createdAt).toLocaleString()}
                  className="text-[11px] text-muted-foreground"
                >
                  {relativeTime(comment.createdAt)}
                </time>
              </div>
              <div
                onClick={stop}
                className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100"
              >
                <ReactionAdder onPick={onToggleReaction} />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </header>

            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {comment.body}
            </p>

            {attachments.length > 0 && (
              <AttachmentList attachments={attachments} />
            )}

            <div
              onClick={stop}
              className="flex flex-wrap items-center gap-1 pt-0.5"
            >
              {reactionGroups.map((g) => (
                <button
                  key={g.emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleReaction(g.emoji)
                  }}
                  title={g.authors.join(", ")}
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                    g.mine
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-sm leading-none">{g.emoji}</span>
                  <span className="tabular-nums">{g.count}</span>
                </button>
              ))}
            </div>

            <footer className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MessageSquare className="size-3" />
                {replyCount === 0
                  ? "No replies yet — click to open thread"
                  : `${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
              </span>
              <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100">
                Open →
              </span>
            </footer>
          </div>
        </div>
      </article>
    </li>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Sheet body (root + flat replies + composer)
// ──────────────────────────────────────────────────────────────────────

function ThreadSheetBody({
  root,
  rootAttachments,
  rootReactions,
  replies,
  attsByComment,
  rxByComment,
  me,
  taskId,
  justAddedId,
  onDelete,
  onToggleReaction,
  onReplySubmit,
}: {
  root: TaskComment
  rootAttachments: CommentAttachment[]
  rootReactions: CommentReaction[]
  replies: TaskComment[]
  attsByComment: Map<string, CommentAttachment[]>
  rxByComment: Map<string, CommentReaction[]>
  me: string
  taskId: string
  justAddedId: string | null
  onDelete: (id: string) => void
  onToggleReaction: (commentId: string, emoji: string) => void
  onReplySubmit: (body: string, staged: StagedAttachment[]) => Promise<void>
}) {
  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>Thread</SheetTitle>
        <SheetDescription>
          {replies.length === 0
            ? "Start the conversation."
            : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <SheetMessage
          comment={root}
          attachments={rootAttachments}
          reactions={rootReactions}
          isRoot
          me={me}
          justAdded={justAddedId === root.id}
          onDelete={() => onDelete(root.id)}
          onToggleReaction={(emoji) => onToggleReaction(root.id, emoji)}
        />

        {replies.length > 0 && (
          <>
            <div className="my-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <ul className="flex flex-col gap-2">
              {replies.map((r) => (
                <li key={r.id}>
                  <SheetMessage
                    comment={r}
                    attachments={attsByComment.get(r.id) ?? []}
                    reactions={rxByComment.get(r.id) ?? []}
                    me={me}
                    justAdded={justAddedId === r.id}
                    onDelete={() => onDelete(r.id)}
                    onToggleReaction={(emoji) =>
                      onToggleReaction(r.id, emoji)
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="border-t p-3">
        <Composer
          taskId={taskId}
          placeholder={`Reply to ${root.author}…`}
          autoFocus
          onSubmit={onReplySubmit}
        />
      </div>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// One message rendered inside the sheet
// ──────────────────────────────────────────────────────────────────────

function SheetMessage({
  comment,
  attachments,
  reactions,
  isRoot,
  me,
  justAdded,
  onDelete,
  onToggleReaction,
}: {
  comment: TaskComment
  attachments: CommentAttachment[]
  reactions: CommentReaction[]
  isRoot?: boolean
  me: string
  justAdded: boolean
  onDelete: () => void
  onToggleReaction: (emoji: string) => void
}) {
  const reactionGroups = groupReactions(reactions, me)

  return (
    <article
      className={`group/msg rounded-lg ${
        isRoot ? "border bg-muted/30" : "bg-transparent"
      } px-3 py-2.5 ${justAdded ? "cortek-fade-in" : ""}`}
    >
      <div className="flex gap-3">
        <MonoAvatar name={comment.author} size={28} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <header className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{comment.author}</span>
              <time
                dateTime={comment.createdAt}
                title={new Date(comment.createdAt).toLocaleString()}
                className="text-[11px] text-muted-foreground"
              >
                {relativeTime(comment.createdAt)}
              </time>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
              <ReactionAdder onPick={onToggleReaction} />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Delete"
                onClick={onDelete}
              >
                <Trash2 />
              </Button>
            </div>
          </header>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {comment.body}
          </p>

          {attachments.length > 0 && (
            <AttachmentList attachments={attachments} />
          )}

          {reactionGroups.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {reactionGroups.map((g) => (
                <button
                  key={g.emoji}
                  type="button"
                  onClick={() => onToggleReaction(g.emoji)}
                  title={g.authors.join(", ")}
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                    g.mine
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className="text-sm leading-none">{g.emoji}</span>
                  <span className="tabular-nums">{g.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Attachment rendering
// ──────────────────────────────────────────────────────────────────────

function AttachmentList({
  attachments,
}: {
  attachments: CommentAttachment[]
}) {
  const images = attachments.filter((a) => isImageUrl(a.url))
  const others = attachments.filter((a) => !isImageUrl(a.url))
  return (
    <div className="flex flex-col gap-2 pt-1">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block overflow-hidden rounded-md border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.url}
                alt={a.label || ""}
                className="block max-h-60 max-w-xs object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="flex flex-col gap-1">
          {others.map((a) => (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="group/att flex items-center gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5 text-xs hover:bg-muted/40"
              >
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                  {a.label || hostOf(a.url)}
                </span>
                <ExternalLink className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/att:opacity-100" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Composer (with attachments + auto-resize)
// ──────────────────────────────────────────────────────────────────────

type StagedAttachment = {
  tempId: string
  url: string
  label: string
}

function Composer({
  taskId,
  placeholder,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  taskId: string
  placeholder: string
  autoFocus?: boolean
  onSubmit: (body: string, staged: StagedAttachment[]) => Promise<void>
  onCancel?: () => void
}) {
  const [body, setBody] = React.useState("")
  const [staged, setStaged] = React.useState<StagedAttachment[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [uploadingCount, setUploadingCount] = React.useState(0)
  const [linkMode, setLinkMode] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const arr = Array.from(files)
    setUploadingCount((c) => c + arr.length)
    try {
      for (const file of arr) {
        const { url, label } = await uploadCommentFile(taskId, file)
        setStaged((prev) => [
          ...prev,
          { tempId: `${Date.now()}-${Math.random()}`, url, label },
        ])
      }
    } finally {
      setUploadingCount((c) => Math.max(0, c - arr.length))
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  function addLink() {
    const trimmed = linkUrl.trim()
    if (!trimmed) return
    setStaged((prev) => [
      ...prev,
      {
        tempId: `${Date.now()}-${Math.random()}`,
        url: trimmed,
        label: hostOf(trimmed),
      },
    ])
    setLinkUrl("")
    setLinkMode(false)
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((s) => s.tempId !== id))
  }

  async function send() {
    if ((!body.trim() && staged.length === 0) || submitting) return
    setSubmitting(true)
    try {
      await onSubmit(body, staged)
      setBody("")
      setStaged([])
    } finally {
      setSubmitting(false)
    }
  }

  const canSend = (body.trim().length > 0 || staged.length > 0) && !submitting

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card/50 p-2 focus-within:bg-card focus-within:ring-1 focus-within:ring-ring/30 transition-shadow">
      <Textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            void send()
          }
        }}
        rows={3}
        placeholder={placeholder}
        className="resize-none border-0 bg-transparent px-1.5 py-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:border-0"
        style={{ fieldSizing: "content" } as React.CSSProperties}
      />

      {staged.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-1">
          {staged.map((s) => (
            <li
              key={s.tempId}
              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-[11px]"
            >
              {isImageUrl(s.url) ? (
                <ImageIcon className="size-3 text-muted-foreground" />
              ) : (
                <FileText className="size-3 text-muted-foreground" />
              )}
              <span className="max-w-[180px] truncate">{s.label}</span>
              <button
                type="button"
                onClick={() => removeStaged(s.tempId)}
                aria-label="Remove"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {linkMode && (
        <div className="flex items-center gap-2 px-1">
          <LinkIcon className="size-3.5 text-muted-foreground" />
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addLink()
              }
              if (e.key === "Escape") {
                setLinkUrl("")
                setLinkMode(false)
              }
            }}
            placeholder="https://…"
            type="url"
            autoFocus
            className="h-7 text-xs"
          />
          <Button type="button" variant="outline" size="xs" onClick={addLink}>
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setLinkUrl("")
              setLinkMode(false)
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-1.5">
        <div className="flex items-center gap-0.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Attach file"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCount > 0}
          >
            <Paperclip />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Add link"
            onClick={() => setLinkMode((s) => !s)}
          >
            <LinkIcon />
          </Button>
          {uploadingCount > 0 && (
            <span className="ml-2 text-[11px] text-muted-foreground">
              Uploading {uploadingCount}…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            ⌘ + Enter to send
          </span>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={send}
            disabled={!canSend}
          >
            <Send />
            {submitting ? "Sending…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Reaction picker (small inline popover)
// ──────────────────────────────────────────────────────────────────────

function ReactionAdder({
  onPick,
}: {
  onPick: (emoji: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Add reaction"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((s) => !s)
        }}
      >
        <Smile />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 flex gap-0.5 rounded-md border bg-popover p-1 shadow-md">
          {QUICK_REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e)
                setOpen(false)
              }}
              className="rounded-md px-1.5 py-1 text-base leading-none hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
