"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Key,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserPlus,
} from "lucide-react";

import type { Profile, UserRole } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLES: { value: UserRole; label: string; hint: string }[] = [
  { value: "super_admin", label: "Super admin", hint: "Full access, can manage users" },
  { value: "manager", label: "Manager", hint: "Manages projects and team work" },
  { value: "dev", label: "Developer", hint: "Standard team member access" },
];

const ROLE_LABEL: Record<UserRole, string> = {
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

export function UserManagement({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: Profile[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [fallbackCred, setFallbackCred] = useState<
    { email: string; password: string } | null
  >(null);

  async function refresh() {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const json = await res.json();
      setUsers(json.users);
    }
    router.refresh();
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" /> Add user
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="divide-y divide-border">
          {users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isMe={u.id === currentUserId}
              onChanged={refresh}
              onCredFallback={setFallbackCred}
            />
          ))}
          {users.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No users yet.
            </div>
          )}
        </div>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
        onCredFallback={setFallbackCred}
      />

      <CredFallbackDialog
        cred={fallbackCred}
        onClose={() => setFallbackCred(null)}
      />
    </div>
  );
}

function UserRow({
  user,
  isMe,
  onChanged,
  onCredFallback,
}: {
  user: Profile;
  isMe: boolean;
  onChanged: () => void | Promise<void>;
  onCredFallback: (cred: { email: string; password: string }) => void;
}) {
  const [working, setWorking] = useState(false);

  async function changeRole(role: UserRole) {
    if (role === user.role) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not change role.");
      toast.success(`Role updated to ${ROLE_LABEL[role]}`);
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setWorking(false);
    }
  }

  async function resetPassword() {
    if (!confirm(`Reset password for ${user.email} and email a new one?`)) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed.");
      if (json.emailSent) {
        toast.success("New password emailed");
      } else if (json.tempPassword) {
        onCredFallback({ email: user.email, password: json.tempPassword });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setWorking(false);
    }
  }

  async function remove() {
    if (!confirm(`Remove ${user.email}? This cannot be undone.`)) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed.");
      toast.success("User removed");
      await onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar size="sm" className="size-9">
        {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.email} /> : null}
        <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {user.full_name || user.email.split("@")[0]}
          </span>
          {isMe && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              You
            </span>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              disabled={working}
            >
              {ROLE_LABEL[user.role]}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs">Change role</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={user.role}
            onValueChange={(v) => changeRole(v as UserRole)}
          >
            {ROLES.map((r) => (
              <DropdownMenuRadioItem key={r.value} value={r.value}>
                <div className="flex flex-col">
                  <span>{r.label}</span>
                  <span className="text-[10px] text-muted-foreground">{r.hint}</span>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground"
              disabled={working}
              aria-label="More actions"
            >
              {working ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoreHorizontal className="size-4" />
              )}
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={resetPassword}>
            <Key className="size-4" /> Reset password
          </DropdownMenuItem>
          {!isMe && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={remove} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4" /> Remove user
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  onCredFallback,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void | Promise<void>;
  onCredFallback: (cred: { email: string; password: string }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("dev");
  const [pending, setPending] = useState(false);

  function reset() {
    setFullName("");
    setEmail("");
    setRole("dev");
  }

  async function submit() {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          role,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not create user.");
      if (json.emailSent) {
        toast.success(`Account created — email sent to ${email.trim()}`);
      } else if (json.tempPassword) {
        onCredFallback({ email: email.trim(), password: json.tempPassword });
      } else {
        toast.success("Account created");
      }
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new user</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with their temporary password.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new_email">Email</Label>
            <Input
              id="new_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <div className="grid gap-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    role === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    disabled={pending}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.hint}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Creating…
              </>
            ) : (
              "Create user"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredFallbackDialog({
  cred,
  onClose,
}: {
  cred: { email: string; password: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!cred} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email could not be sent</DialogTitle>
          <DialogDescription>
            The account was created, but the email failed. Share these credentials manually.
          </DialogDescription>
        </DialogHeader>
        {cred && (
          <div className="flex flex-col gap-3">
            <CredField label="Email" value={cred.email} />
            <CredField label="Temporary password" value={cred.password} mono />
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button>Done</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CredField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  async function copy() {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
        <span className={`flex-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
        <Button size="xs" variant="ghost" onClick={copy} className="h-6">
          <Copy className="size-3" />
        </Button>
      </div>
    </div>
  );
}
