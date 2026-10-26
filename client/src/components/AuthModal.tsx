import { useEffect, useState, type FormEvent } from "react";
import {
  closeAuth,
  sendReset,
  setNewPassword,
  signIn,
  signInWithGoogle,
  signUp,
  useAuth,
} from "../lib/cloud";
import { googleEnabled } from "../lib/supabase";

type Mode = "signin" | "signup" | "forgot" | "recovery";

const TITLES: Record<Mode, string> = {
  signin: "Welcome back",
  signup: "Create your account",
  forgot: "Reset your password",
  recovery: "Choose a new password",
};

export function AuthModal() {
  const auth = useAuth();
  const open = auth.modalOpen || auth.recovering;

  if (!open || auth.status === "off") return null;

  // Re-mount the form when the dialog reopens so it starts clean.
  return <Form key={auth.recovering ? "r" : "o"} recovering={auth.recovering} />;
}

function Form({ recovering }: { recovering: boolean }) {
  const [mode, setMode] = useState<Mode>(recovering ? "recovery" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !recovering) closeAuth();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recovering]);

  const go = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;

    if (mode !== "forgot" && password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    const clean = email.trim();
    const result =
      mode === "signin"
        ? await signIn(clean, password)
        : mode === "signup"
          ? await signUp(clean, password)
          : mode === "forgot"
            ? await sendReset(clean)
            : await setNewPassword(password);

    setBusy(false);

    if (!result.ok) setError(result.error);
    else if (result.notice) {
      setNotice(result.notice);
      if (mode === "signup") setMode("signin");
    }
    // A successful sign-in closes the dialog from the auth store.
  };

  return (
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={TITLES[mode]}
      onClick={() => !recovering && closeAuth()}
    >
      <form
        className="auth-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3>{TITLES[mode]}</h3>

        {mode === "signup" && (
          <p className="auth-sub">
            Save your XP, streak and flashcards, and pick up on any device.
          </p>
        )}

        {mode !== "recovery" && (
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        )}

        {mode !== "forgot" && (
          <label>
            {mode === "recovery" ? "New password" : "Password"}
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              autoFocus={mode === "recovery"}
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}

        {error && (
          <p className="auth-msg is-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="auth-msg" role="status">
            {notice}
          </p>
        )}

        <button type="submit" className="enter-stage" disabled={busy}>
          {busy
            ? "Please wait"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Save password"}
        </button>

        {googleEnabled && (mode === "signin" || mode === "signup") && (
          <button
            type="button"
            className="ghost-button auth-google"
            onClick={async () => {
              const result = await signInWithGoogle();
              if (!result.ok) setError(result.error);
            }}
          >
            Continue with Google
          </button>
        )}

        <div className="auth-links">
          {mode === "signin" && (
            <>
              <button type="button" onClick={() => go("signup")}>
                Create an account
              </button>
              <button type="button" onClick={() => go("forgot")}>
                Forgot password?
              </button>
            </>
          )}
          {mode === "signup" && (
            <button type="button" onClick={() => go("signin")}>
              I already have an account
            </button>
          )}
          {mode === "forgot" && (
            <button type="button" onClick={() => go("signin")}>
              Back to sign in
            </button>
          )}
          {!recovering && (
            <button type="button" onClick={closeAuth}>
              Not now
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
