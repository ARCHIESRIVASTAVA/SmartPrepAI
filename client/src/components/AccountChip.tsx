import { useEffect, useState } from "react";
import { Cloud, CloudOff, LogIn, LogOut } from "lucide-react";
import { openAuth, signOut, useAuth } from "../lib/cloud";

const SYNC_TEXT = {
  idle: "Up to date",
  syncing: "Saving",
  saved: "Saved to your account",
  error: "Couldn't sync, will retry",
} as const;

/** Sign-in button, or the signed-in account with a small menu. */
export function AccountChip({ className = "" }: { className?: string }) {
  const auth = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  if (auth.status === "off" || auth.status === "loading") return null;

  if (auth.status === "out") {
    return (
      <button
        type="button"
        className={`account-chip ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          openAuth();
        }}
      >
        <LogIn size={14} aria-hidden="true" />
        <span>Sign in</span>
      </button>
    );
  }

  const initial = (auth.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className={`account-wrap ${className}`}>
      <button
        type="button"
        className="account-chip is-in"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="account-initial">{initial}</span>
        {auth.sync === "error" ? (
          <CloudOff size={14} aria-hidden="true" />
        ) : (
          <Cloud size={14} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="account-menu" onClick={(e) => e.stopPropagation()}>
          <p className="account-email">{auth.email}</p>
          <p className={`account-sync is-${auth.sync}`} role="status">
            {SYNC_TEXT[auth.sync]}
          </p>
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              if (
                auth.sync === "error" &&
                !window.confirm(
                  "Your latest changes haven't synced. Sign out anyway?"
                )
              ) {
                return;
              }
              setOpen(false);
              void signOut();
            }}
          >
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
