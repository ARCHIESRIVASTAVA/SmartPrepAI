import { useSyncExternalStore } from "react";
import { emit } from "./rewards";
import { mergeAll, type CloudData } from "./merge";
import {
  getProgress,
  replaceProgress,
  sanitizeProgress,
  subscribeProgress,
} from "./progress";
import {
  getReview,
  replaceReview,
  sanitizeReview,
  subscribeReview,
} from "./review";
import {
  getSeenAll,
  replaceSeen,
  sanitizeSeen,
  subscribeSeen,
} from "./seen";
import { authEnabled, supabase } from "./supabase";

/*
  Account state and cloud sync.

  Local stores stay the source of truth for the interface. When signed
  in, this module merges the cloud copy into them on sign-in and
  whenever the tab regains focus, and pushes changes after a short
  pause. Merging (rather than overwriting) means moving between phone
  and desktop never throws progress away.
*/

export type SyncStatus = "idle" | "syncing" | "saved" | "error";

export type AuthState = {
  /** "off" = accounts not configured, "loading" = checking session */
  status: "off" | "loading" | "out" | "in";
  userId: string | null;
  email: string | null;
  sync: SyncStatus;
  /** set when the user arrived from a password-reset email */
  recovering: boolean;
  /** whether the sign-in dialog is showing */
  modalOpen: boolean;
};

let auth: AuthState = {
  status: authEnabled ? "loading" : "off",
  userId: null,
  email: null,
  sync: "idle",
  recovering: false,
  modalOpen: false,
};

const listeners = new Set<() => void>();

function setAuth(patch: Partial<AuthState>) {
  auth = { ...auth, ...patch };
  listeners.forEach((l) => l());
}

export const openAuth = () => setAuth({ modalOpen: true });
export const closeAuth = () => setAuth({ modalOpen: false });

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => auth
  );
}

// ---------------- local ownership ----------------

const OWNER_KEY = "smartprep-owner-v1";

const getOwner = () => {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
};

const setOwner = (id: string | null) => {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // ignore
  }
};

const EMPTY_DATA = (): CloudData => ({
  progress: sanitizeProgress(null),
  review: sanitizeReview(null),
  seen: {},
});

const readLocal = (): CloudData => ({
  progress: getProgress(),
  review: getReview(),
  seen: getSeenAll(),
});

let applying = false;

function writeLocal(data: CloudData) {
  applying = true;
  try {
    replaceProgress(data.progress);
    replaceReview(data.review);
    replaceSeen(data.seen);
  } finally {
    applying = false;
  }
}

const same = (a: CloudData, b: CloudData) =>
  JSON.stringify(a) === JSON.stringify(b);

// ---------------- cloud row ----------------

async function fetchRemote(userId: string): Promise<CloudData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.data) return null;

  const raw = data.data as Partial<CloudData>;
  return {
    progress: sanitizeProgress(raw.progress),
    review: sanitizeReview(raw.review),
    seen: sanitizeSeen(raw.seen),
  };
}

async function pushRemote(userId: string, data: CloudData) {
  if (!supabase) return;

  const { error } = await supabase.from("user_state").upsert({
    user_id: userId,
    data,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

// ---------------- sync engine ----------------

let running: Promise<void> | null = null;
let again = false;
let timer: number | undefined;
let lastPull = 0;

/** Pull, merge with local, then push if the cloud is behind. */
async function syncNow() {
  const userId = auth.userId;
  if (!supabase || !userId) return;

  // Never run two at once; queue one more pass instead.
  if (running) {
    again = true;
    return running;
  }

  running = (async () => {
    setAuth({ sync: "syncing" });

    try {
      const remote = await fetchRemote(userId);
      const local = readLocal();
      const merged = remote ? mergeAll(local, remote) : local;

      if (!same(merged, local)) writeLocal(merged);
      if (!remote || !same(merged, remote)) await pushRemote(userId, merged);

      lastPull = Date.now();
      setAuth({ sync: "saved" });
    } catch {
      setAuth({ sync: "error" });
    }
  })().finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });

  return running;
}

function schedulePush() {
  if (!auth.userId || applying) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), 1500);
}

function refresh() {
  if (!auth.userId) return;
  if (Date.now() - lastPull < 20_000) return;
  void syncNow();
}

// ---------------- session handling ----------------

async function onSignedIn(userId: string, email: string | null) {
  const owner = getOwner();

  // Data left on this device by a different account must not leak in.
  if (owner && owner !== userId) writeLocal(EMPTY_DATA());

  setOwner(userId);
  setAuth({ status: "in", userId, email, modalOpen: false });
  await syncNow();
}

let started = false;

export function startAuth() {
  if (started || !supabase) return;
  started = true;

  subscribeProgress(schedulePush);
  subscribeReview(schedulePush);
  subscribeSeen(schedulePush);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("focus", refresh);
  window.addEventListener("online", refresh);

  supabase.auth.onAuthStateChange((event, session) => {
    // Defer: calling Supabase inside this callback can deadlock.
    window.setTimeout(() => {
      if (event === "PASSWORD_RECOVERY") setAuth({ recovering: true });

      if (session?.user) {
        if (auth.userId !== session.user.id) {
          void onSignedIn(session.user.id, session.user.email ?? null);
        }
      } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        setAuth({ status: "out", userId: null, email: null, sync: "idle" });
      }
    }, 0);
  });
}

// ---------------- actions ----------------

export type AuthResult = { ok: true; notice?: string } | { ok: false; error: string };

const fail = (message?: string): AuthResult => ({
  ok: false,
  error: message || "Something went wrong. Please try again.",
});

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return fail("Accounts are not set up yet.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? fail(error.message) : { ok: true };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return fail("Accounts are not set up yet.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  });

  if (error) return fail(error.message);

  // With email confirmation on there is no session yet.
  return data.session
    ? { ok: true }
    : { ok: true, notice: "Check your email and click the link to confirm, then sign in." };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return fail("Accounts are not set up yet.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return error ? fail(error.message) : { ok: true };
}

export async function sendReset(email: string): Promise<AuthResult> {
  if (!supabase) return fail("Accounts are not set up yet.");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return error
    ? fail(error.message)
    : { ok: true, notice: "If that email has an account, a reset link is on its way." };
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  if (!supabase) return fail("Accounts are not set up yet.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.message);
  setAuth({ recovering: false });
  return { ok: true, notice: "Password updated." };
}

export async function signOut() {
  if (!supabase) return;

  // Save anything still waiting, then wipe this device.
  window.clearTimeout(timer);
  try {
    await syncNow();
  } catch {
    // best effort
  }

  await supabase.auth.signOut();
  setOwner(null);
  writeLocal(EMPTY_DATA());
  setAuth({ status: "out", userId: null, email: null, sync: "idle" });
  emit({ type: "say", mood: "idle", text: "Signed out. See you soon!" });
}
