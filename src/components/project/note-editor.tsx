"use client"

import "@blocknote/core/fonts/inter.css"
import "@blocknote/react/style.css"
import "@blocknote/mantine/style.css"

import * as React from "react"
import { useTheme } from "next-themes"
import { Loader2, Trash2, Video, X } from "lucide-react"
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  type BlockNoteEditor,
  type PartialBlock,
} from "@blocknote/core"
import {
  createReactBlockSpec,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from "@blocknote/react"
import { BlockNoteView } from "@blocknote/mantine"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import {
  deleteNote,
  insertNote,
  updateNote,
  type NoteBlocks,
  type ProjectNote,
} from "@/lib/notes-db"

const LOOM_URL = /loom\.com\/share\/([a-f0-9]+)/i

function toLoomEmbed(url: string): string | null {
  const m = url.match(LOOM_URL)
  return m ? `https://www.loom.com/embed/${m[1]}` : null
}

// ─── Custom Loom block ─────────────────────────────────────────────────────

const loomSpec = createReactBlockSpec(
  {
    type: "loom",
    propSchema: {
      url: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block }) => {
      const url = block.props.url as string
      const src = toLoomEmbed(url)
      if (!src) {
        return (
          <div className="my-2 rounded-md border border-dashed border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            Not a recognised Loom URL: {url || "(empty)"}
          </div>
        )
      }
      return (
        <div className="my-2 w-full overflow-hidden rounded-lg border bg-muted/30">
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              src={src}
              title="Loom recording"
              allow="fullscreen"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {url}
          </a>
        </div>
      )
    },
  }
)

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    loom: loomSpec(),
  },
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppEditor = BlockNoteEditor<any, any, any>

// ─── Image upload to Supabase storage ──────────────────────────────────────

async function uploadNoteImage(projectId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase()
  const key = `${projectId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from("project-notes")
    .upload(key, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || undefined,
    })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from("project-notes").getPublicUrl(key)
  return data.publicUrl
}

// ─── Initial content helpers ───────────────────────────────────────────────

function initialContentFor(note: ProjectNote | null): PartialBlock[] | undefined {
  if (!note) return undefined
  if (Array.isArray(note.contentBlocks) && note.contentBlocks.length > 0) {
    return note.contentBlocks as PartialBlock[]
  }
  if (note.content?.trim()) {
    return note.content.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line, styles: {} }] : [],
    }))
  }
  return undefined
}

// ─── Slash menu: Loom item ─────────────────────────────────────────────────

function loomSlashItem(editor: AppEditor): DefaultReactSuggestionItem {
  return {
    title: "Loom embed",
    aliases: ["loom", "video", "recording"],
    group: "Media",
    subtext: "Paste a loom.com share URL",
    icon: <Video className="size-[18px]" />,
    onItemClick: () => {
      const url = window.prompt("Loom share URL", "https://www.loom.com/share/…")
      if (!url) return
      const cursor = editor.getTextCursorPosition()
      editor.insertBlocks(
        [
          {
            type: "loom",
            props: { url: url.trim() },
          } as unknown as PartialBlock,
        ],
        cursor.block,
        "after"
      )
    },
  }
}

// ─── Editor dialog ─────────────────────────────────────────────────────────

export function NoteEditorDialog({
  projectId,
  note,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  projectId: string
  note: ProjectNote | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (note: ProjectNote) => void
  onDeleted?: (id: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {open && (
          <NoteEditorBody
            projectId={projectId}
            note={note}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function NoteEditorBody({
  projectId,
  note,
  onSaved,
  onDeleted,
  onClose,
}: {
  projectId: string
  note: ProjectNote | null
  onSaved: (note: ProjectNote) => void
  onDeleted?: (id: string) => void
  onClose: () => void
}) {
  const { resolvedTheme } = useTheme()
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const editor = useCreateBlockNote({
    schema,
    initialContent: initialContentFor(note),
    uploadFile: (file) => uploadNoteImage(projectId, file),
  })

  // When a Loom URL is pasted as the entire clipboard payload, replace the
  // default paragraph-with-link insertion with a Loom block.
  React.useEffect(() => {
    const root = editor.domElement
    if (!root) return
    function onPaste(e: ClipboardEvent) {
      const text = e.clipboardData?.getData("text/plain")?.trim() ?? ""
      if (!text || !LOOM_URL.test(text) || /\s/.test(text)) return
      e.preventDefault()
      const cursor = editor.getTextCursorPosition()
      editor.insertBlocks(
        [
          {
            type: "loom",
            props: { url: text },
          } as unknown as PartialBlock,
        ],
        cursor.block,
        "after"
      )
    }
    root.addEventListener("paste", onPaste, true)
    return () => root.removeEventListener("paste", onPaste, true)
  }, [editor])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const blocks = editor.document as NoteBlocks
      const markdown = await editor.blocksToMarkdownLossy(editor.document)
      if (note) {
        const updated = await updateNote(note.id, {
          contentBlocks: blocks,
          content: markdown,
        })
        onSaved(updated)
      } else {
        // Don't save an empty note.
        if (!markdown.trim()) {
          onClose()
          return
        }
        const created = await insertNote({
          projectId,
          contentBlocks: blocks,
          content: markdown,
        })
        onSaved(created)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!note || !onDeleted) return
    if (!window.confirm("Delete this note?")) return
    setDeleting(true)
    try {
      await deleteNote(note.id)
      onDeleted(note.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete")
      setDeleting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{note ? "Edit note" : "New note"}</DialogTitle>
        <DialogDescription>
          Type, paste images, drop a Loom link — slash <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">/</kbd> for blocks.
        </DialogDescription>
      </DialogHeader>

      <div className="cortek-note-editor max-h-[60vh] min-h-[260px] overflow-y-auto rounded-md border bg-background">
        <BlockNoteView
          editor={editor}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          slashMenu={false}
          className="py-3"
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor),
                  loomSlashItem(editor),
                ],
                query
              )
            }
          />
        </BlockNoteView>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter className="sm:justify-between">
        {note && onDeleted ? (
          <Button
            type="button"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            <X />
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : null}
            {saving ? "Saving…" : note ? "Save changes" : "Add note"}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
