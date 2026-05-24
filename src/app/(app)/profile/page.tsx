import { requireProfile } from "@/lib/auth";
import { ProfileEditor } from "./profile-editor";

export default async function ProfilePage() {
  const profile = await requireProfile();
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage how you appear in Cortek and how you sign in.
        </p>
      </div>
      <ProfileEditor profile={profile} />
    </div>
  );
}
