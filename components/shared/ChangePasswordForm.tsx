"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiError";

// Self-service password change for any logged-in user. Verifies the current
// password server-side before applying the new one.
export function ChangePasswordForm({ className = "" }: { className?: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const changePassword = useChangePassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (next === current) {
      toast.error("New password must be different from your current one");
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to change password"));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-border bg-card p-5 space-y-4 max-w-md ${className}`}
      noValidate
    >
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cp-current" className="text-xs">Current password</Label>
        <Input
          id="cp-current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="cp-new" className="text-xs">New password</Label>
        <Input
          id="cp-new"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
        />
        <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cp-confirm" className="text-xs">Confirm new password</Label>
        <Input
          id="cp-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={changePassword.isPending || !current || !next || !confirm}
      >
        {changePassword.isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
