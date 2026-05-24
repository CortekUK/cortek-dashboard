import { supabase } from "@/lib/supabase"

export type CommentReaction = {
  id: string
  commentId: string
  emoji: string
  author: string
  createdAt: string
}

type Row = {
  id: string
  comment_id: string
  emoji: string
  author: string
  created_at: string
}

const COLUMNS = "id, comment_id, emoji, author, created_at"

function fromRow(r: Row): CommentReaction {
  return {
    id: r.id,
    commentId: r.comment_id,
    emoji: r.emoji,
    author: r.author,
    createdAt: r.created_at,
  }
}

export async function listCommentReactions(
  commentIds: string[]
): Promise<CommentReaction[]> {
  if (commentIds.length === 0) return []
  const { data, error } = await supabase
    .from("task_comment_reactions")
    .select(COLUMNS)
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as Row[]).map(fromRow)
}

export async function addCommentReaction(input: {
  commentId: string
  emoji: string
  author: string
}): Promise<CommentReaction | null> {
  const { data, error } = await supabase
    .from("task_comment_reactions")
    .insert({
      comment_id: input.commentId,
      emoji: input.emoji,
      author: input.author.trim() || "Anonymous",
    })
    .select(COLUMNS)
    .single()
  if (error) {
    // 23505 = unique violation — already reacted, treat as no-op.
    if ((error as { code?: string }).code === "23505") return null
    throw error
  }
  return fromRow(data as Row)
}

export async function removeCommentReaction(input: {
  commentId: string
  emoji: string
  author: string
}): Promise<void> {
  const { error } = await supabase
    .from("task_comment_reactions")
    .delete()
    .eq("comment_id", input.commentId)
    .eq("emoji", input.emoji)
    .eq("author", input.author.trim() || "Anonymous")
  if (error) throw error
}

export const QUICK_REACTIONS: string[] = [
  "👍",
  "❤️",
  "🎉",
  "👀",
  "🚀",
  "😂",
  "🙏",
  "🔥",
]
