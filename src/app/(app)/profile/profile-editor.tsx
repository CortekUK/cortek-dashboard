"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Eye, EyeOff, Loader2, Pencil, Trash2, X } from "lucide-react";

import type { Profile } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<Profile["role"], string> = {
  super_admin: "Super admin",
  manager: "Manager",
  dev: "Developer",
};

function initials(name: string | null | undefined, email: string) {
  const source = (name || email).trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || source[0].toUpperCase();
}

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<Profile>(profile);

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <AvatarBand profile={optimistic} onUpdate={setOptimistic} router={router} />

      <Band title="Identity">
        <EditableRow
          label="Full name"
          value={optimistic.full_name || ""}
          placeholder="Add your name"
          render={(value, onChange, onSave, onCancel, pending) => (
            <Input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") onCancel();
              }}
            />
          )}
          onSave={async (val) => {
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ full_name: val }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || "Could not update name.");
            setOptimistic((p) => ({ ...p, full_name: val }));
            toast.success("Name updated");
            router.refresh();
          }}
        />
        <EditableRow
          label="Email"
          value={optimistic.email}
          render={(value, onChange, onSave, onCancel, pending) => (
            <Input
              autoFocus
              type="email"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") onCancel();
              }}
            />
          )}
          onSave={async (val) => {
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: val }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error || "Could not update email.");
            setOptimistic((p) => ({ ...p, email: val }));
            toast.success("Email updated");
            router.refresh();
          }}
        />
        <ReadOnlyRow label="Role" value={ROLE_LABEL[optimistic.role]} />
      </Band>

      <Band title="Security">
        <PasswordRow />
      </Band>
    </div>
  );
}

function AvatarBand({
  profile,
  onUpdate,
  router,
}: {
  profile: Profile;
  onUpdate: (next: Profile) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Upload failed.");
      onUpdate({ ...profile, avatar_url: json.avatar_url });
      toast.success("Photo updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onRemove() {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      onUpdate({ ...profile, avatar_url: null });
      toast.success("Photo removed");
      router.refresh();
    } catch {
      toast.error("Could not remove photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Band title="Photo">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar size="lg" className="size-16">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name || profile.email} />
            ) : null}
            <AvatarFallback className="text-base">
              {initials(profile.full_name, profile.email)}
            </AvatarFallback>
          </Avatar>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 className="size-4 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="size-3.5" />
            {profile.avatar_url ? "Change photo" : "Upload photo"}
          </Button>
          {profile.avatar_url && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onRemove}
              disabled={uploading}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> Remove
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onPick}
          />
        </div>
      </div>
    </Band>
  );
}

function Band({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">{children}</div>
      </div>
    </section>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function EditableRow({
  label,
  value,
  placeholder,
  render,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  render: (
    value: string,
    onChange: (next: string) => void,
    onSave: () => void,
    onCancel: () => void,
    pending: boolean
  ) => React.ReactNode;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);

  async function commit() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    setPending(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={cn(
          "group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
        )}
      >
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className={value ? "" : "text-muted-foreground"}>
            {value || placeholder || "Not set"}
          </span>
          <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="px-4 py-3">
      <Label className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {render(draft, setDraft, commit, cancel, pending)}
        </div>
        <Button size="sm" variant="default" onClick={commit} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function PasswordRow() {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [pending, setPending] = useState(false);

  async function save() {
    if (!current || next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not change password.");
      toast.success("Password changed");
      setCurrent("");
      setNext("");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="text-sm text-muted-foreground">Password</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono tracking-widest">••••••••</span>
          <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Current password</Label>
        <div className="relative">
          <Input
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            disabled={pending}
            className="pr-9"
            autoComplete="current-password"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">New password</Label>
        <div className="relative">
          <Input
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={pending}
            className="pr-9"
            autoComplete="new-password"
            minLength={8}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowNext((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNext ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Save password"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCurrent("");
            setNext("");
            setEditing(false);
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
