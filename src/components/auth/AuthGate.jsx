import { useEffect, useState } from "react";
import { supabaseAuth } from "../../services/supabaseAuth.js";
import { activityLogService } from "../../services/activityLogService.js";
import { roleService } from "../../services/roleService.js";
import { LoginScreen } from "./LoginScreen.jsx";
import { MaterialIcon } from "../MaterialIcon.jsx";

let loggedOAuthLogin = false;

/**
 * Dashboard hanya dirender setelah akun admin login (Supabase Auth).
 * Sesi berakhir / refresh token ditolak → otomatis kembali ke layar login.
 */
export function AuthGate({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(() => supabaseAuth.getUser());
  // { email, role } — dikaitkan ke email agar peran akun sebelumnya tidak terbawa saat ganti akun
  const [roleState, setRoleState] = useState(null);
  const [initialError, setInitialError] = useState(null);

  useEffect(() => {
    const unsubscribe = supabaseAuth.subscribe((session) => setUser(session?.user || null));
    let active = true;
    supabaseAuth.init().then(({ signedInWithOAuth, error }) => {
      if (!active) return;
      // init() dimemo & effect berjalan 2x di StrictMode: log login Google cukup sekali
      if (signedInWithOAuth && !loggedOAuthLogin) {
        loggedOAuthLogin = true;
        activityLogService.log({ action: "auth.login", details: { method: "google" } });
      }
      setInitialError(error);
      setUser(supabaseAuth.getUser());
      setReady(true);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const userEmail = user?.email || null;
  useEffect(() => {
    if (!userEmail) return;
    let active = true;
    roleService.fetchMyRole().then((role) => {
      if (active) setRoleState({ email: userEmail, role });
    });
    return () => {
      active = false;
    };
  }, [userEmail]);
  const role = roleState?.email === userEmail ? roleState.role : null;

  async function handleSignIn(email, password) {
    await supabaseAuth.signIn(email, password);
    activityLogService.log({ action: "auth.login", details: { method: "password" } });
  }

  async function handleSignOut() {
    await activityLogService.log({ action: "auth.logout" });
    await supabaseAuth.signOut();
  }

  const loadingScreen = (
    <main className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
        <MaterialIcon name="hourglass_top" className="text-[18px] text-[#0284c7]" />
        Memeriksa sesi login...
      </span>
    </main>
  );

  if (!ready) return loadingScreen;

  if (!user) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        onSignInWithGoogle={() => supabaseAuth.signInWithGoogle()}
        initialError={initialError}
      />
    );
  }

  if (!role) return loadingScreen;

  return children({ user, role, onSignOut: handleSignOut });
}
