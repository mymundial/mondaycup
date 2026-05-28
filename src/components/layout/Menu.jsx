import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from "firebase/auth";
import { ASSETS } from "../../data/assets.js";
import { auth } from "../../firebase";
import { ensureUserDocument } from "../../lib/firebaseUser";
import { HamburgerIcon } from "../shared.jsx";
import { AuthEmailCommsCheckbox, AuthForgotPasswordButton, AuthPrimaryButton, AuthTabs, AuthTextInput, PasswordVisibilityButton } from "../auth/AuthFormParts.jsx";

const MENU_ITEMS = [
  { title: "MATCH", action: "onMatch" },
  { title: "CLUBHOUSE", action: "onClubhouse" },
  { title: "SCHEDULE", action: "onFixtures" },
  { title: "TROPHIES", action: "onTrophyCabinet" },
  { title: "STANDINGS", action: "onGroups" },
  { title: "RANKING", action: "onLeaderboard" },
];

const MENU_FRAME =
  "w-[calc(100vw_-_24px)] max-w-[408px] overflow-hidden rounded-[1.65rem]";

const MENU_HEADER =
  "relative mb-4 grid h-14 grid-cols-[44px_1fr_44px] items-center gap-2 px-0";

const MENU_TITLE_CLASS =
  "home-copy-bold text-[28px] uppercase leading-none tracking-[0.07em] text-[#F5F1E8]";

const inputClass =
  "home-copy-regular h-9 w-full rounded-[0.85rem] border border-[#F5F0E6]/18 bg-[#F5F0E6]/94 py-0 pl-11 pr-4 text-[15px] uppercase tracking-[0.055em] text-[#0B5F35] outline-none placeholder:text-[#0B5F35]/34 focus:border-[#F7D117]";

function runAndClose(handler, onClose) {
  if (typeof onClose === "function") onClose();
  if (typeof handler === "function") handler();
}

function CloseIcon({ small = false }) {
  const wrap = small ? "h-5 w-5" : "h-6 w-6";
  const bar = small ? "h-[3px] w-6" : "h-[3px] w-7";

  return (
    <span className={`relative block ${wrap}`} aria-hidden="true">
      <span className={`absolute left-1/2 top-1/2 block ${bar} -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-[#F5F1E8]`} />
      <span className={`absolute left-1/2 top-1/2 block ${bar} -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-[#F5F1E8]`} />
    </span>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5L8 12L15 19" />
    </svg>
  );
}

function AtIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M16.1 8.1v5.2c0 1.2.7 2 1.8 2 1.5 0 2.6-1.6 2.6-3.6 0-4.7-3.4-8.2-8.2-8.2-5.2 0-8.8 3.8-8.8 8.8 0 5.1 3.8 8.2 8.9 8.2 1.7 0 3.2-.3 4.6-.9" />
    </svg>
  );
}

function PadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.4" />
      <path d="M8.4 10V7.6C8.4 5.4 10 4 12 4s3.6 1.4 3.6 3.6V10" />
      <path d="M12 14.2v2.3" />
    </svg>
  );
}

function StarIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.75l2.72 5.52 6.1.89-4.41 4.3 1.04 6.07L12 16.66l-5.45 2.87 1.04-6.07-4.41-4.3 6.1-.89L12 2.75z" />
    </svg>
  );
}

function AuthField({ icon, children }) {
  return (
    <label className="block text-left">
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-[#0B5F35]/82">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}

function MenuTile({ title, onClick, variant = "primary" }) {
  const classes = {
    primary:
      "border-[#E4C51C]/50 bg-[#F2D118] text-[#063B25] hover:bg-[#FFE23A]",
    auth:
      "border-[#F2D118]/28 bg-[#063B25] text-[#F2D118] hover:bg-[#07462B]",
    danger:
      "border-[#B94135]/28 bg-[#B94135] text-[#F5F1E8] hover:bg-[#C84A3D]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[52px] items-center justify-center rounded-[0.95rem] border px-3 py-3 text-center shadow-[0_9px_18px_rgba(0,0,0,0.14)] transition-transform active:scale-[0.98] ${classes[variant]}`}
    >
      <span className="home-copy-bold text-[14px] font-black uppercase leading-none tracking-[0.08em]">
        {title}
      </span>
    </button>
  );
}

function MenuHeader({ title = "MENU", onClose, onBack, authView = false, authLogoBack = false }) {
  return (
    <header className={MENU_HEADER}>
      <button
        type="button"
        onClick={authView && !authLogoBack ? onBack : undefined}
        aria-label={authView && !authLogoBack ? "Back to menu" : "Monday Cup"}
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${authView && !authLogoBack ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {authView && !authLogoBack ? (
          <BackIcon />
        ) : (
          <img
            src={ASSETS.branding.mondayLogo}
            alt="Monday Cup"
            className="h-10 w-10 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
            draggable={false}
          />
        )}
      </button>

      <h2 className={`${MENU_TITLE_CLASS} flex h-10 items-center justify-center text-center`}>
        {title}
      </h2>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-transparent text-[#F5F1E8]"
      >
        <CloseIcon small />
      </button>
    </header>
  );
}

export function AuthMenuPanel({ onClose, onBack, onAuthComplete, initialMode = "signin", showLogoBack = false }) {
  const [mode, setMode] = useState(initialMode || "signin");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [verifyUser, setVerifyUser] = useState(null);
  const [verifyProfile, setVerifyProfile] = useState(null);
  const [verifyButtonText, setVerifyButtonText] = useState("VERIFY YOUR EMAIL ADDRESS");
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    setMode(initialMode || "signin");
  }, [initialMode]);

  const isSignup = mode === "signup";

  const completeVerifiedAuth = async (user = verifyUser, profile = verifyProfile) => {
    if (!user || verificationComplete) return;
    setVerificationComplete(true);
    await ensureUserDocument(user, profile?.username || user.displayName || "Player", {
      ...(profile || {}),
      accountStatus: { emailVerified: true, verificationRequired: false },
    });
    await onAuthComplete?.(user, {
      navigate: false,
      preserveGuestProgress: true,
      source: "menu-auth",
      emailVerified: true,
    });
    setVerifyButtonText("EMAIL VERIFIED");
    window.setTimeout(() => onClose?.(), 700);
  };

  const checkEmailVerification = async () => {
    const user = verifyUser || auth.currentUser;
    if (!user) return false;
    await user.reload();
    const freshUser = auth.currentUser || user;
    if (freshUser.emailVerified) {
      await completeVerifiedAuth(freshUser);
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!verifyUser || verificationComplete) return undefined;
    const handleFocus = () => { checkEmailVerification().catch(() => {}); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleFocus();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(handleFocus, 5000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, [verifyUser, verificationComplete]);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode) => {
    resetMessages();
    setMode(nextMode);
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    resetMessages();

    const cleanNickname = nickname.trim().replace(/[^a-z0-9]/gi, "").slice(0, 10);
    const cleanEmail = email.trim().toLowerCase().replace(",", ".");

    if (!cleanEmail) {
      setError("Please enter an email address");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters");
      return;
    }

    if (isSignup && !cleanNickname) {
      setError("Please enter a username");
      return;
    }

    try {
      setLoading(true);
      const cred = isSignup
        ? await createUserWithEmailAndPassword(auth, cleanEmail, password)
        : await signInWithEmailAndPassword(auth, cleanEmail, password);

      if (isSignup) {
        await updateProfile(cred.user, { displayName: cleanNickname });
        const profile = {
          username: cleanNickname,
          emailOptIn,
          accountStatus: { emailVerified: false, verificationRequired: true },
        };
        await ensureUserDocument(cred.user, cleanNickname, profile);
        setVerifyProfile(profile);
        setVerifyUser(cred.user);
        setVerifyButtonText("VERIFY YOUR EMAIL ADDRESS");
        return;
      }

      await cred.user.reload();
      const freshUser = auth.currentUser || cred.user;
      if (!freshUser.emailVerified) {
        setVerifyProfile({ accountStatus: { emailVerified: false, verificationRequired: true } });
        setVerifyUser(freshUser);
        setVerifyButtonText("VERIFY YOUR EMAIL ADDRESS");
        return;
      }

      await ensureUserDocument(cred.user, cred.user.displayName || "Player", {
        accountStatus: { emailVerified: true, verificationRequired: false },
      });

      await onAuthComplete?.(cred.user, {
        navigate: false,
        preserveGuestProgress: true,
        source: "menu-auth",
        emailVerified: true,
      });

      setSuccess("Signed in welcome back");
      window.setTimeout(() => onClose?.(), 250);
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("email-already-in-use")) setError("That email is already registered");
      else if (code.includes("invalid-email")) setError("Please enter a valid email address");
      else if (code.includes("missing-password")) setError("Please enter a password");
      else if (code.includes("weak-password")) setError("Password should be at least 6 characters");
      else if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) setError("Email or password not recognised");
      else if (code.includes("operation-not-allowed")) setError("Email login disabled");
      else setError(err?.message || "Something went wrong please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendVerification(event) {
    event?.preventDefault?.();
    resetMessages();
    const user = verifyUser || auth.currentUser;
    if (!user) {
      setError("Please sign in again");
      return;
    }
    try {
      setLoading(true);
      const alreadyVerified = await checkEmailVerification();
      if (alreadyVerified) return;
      await sendEmailVerification(user);
      setVerifyButtonText("PLEASE CHECK YOUR EMAIL");
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("too-many-requests")) setError("Please wait before sending another email");
      else setError(err?.message || "Could not send verification email");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    resetMessages();

    const cleanEmail = email.trim().toLowerCase().replace(",", ".");
    if (!cleanEmail) {
      setError("Please enter your email address first");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, cleanEmail);
      setSuccess("Password reset link sent");
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("invalid-email")) setError("Please enter a valid email address");
      else setError(err?.message || "Something went wrong please try again");
    } finally {
      setLoading(false);
    }
  }

  if (verifyUser) {
    return (
      <>
        <MenuHeader title="CLUBHOUSE" onClose={onClose} onBack={onBack} authView authLogoBack={showLogoBack} />
        <div className="mt-2 space-y-2 text-center">
          <div className="home-copy-bold text-[20px] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">VERIFY YOUR EMAIL</div>
          <p className="home-copy-regular mx-auto max-w-[280px] text-[10px] uppercase leading-snug tracking-[0.07em] text-[#F5F1E8]/78">
            Check the inbox for {verifyUser.email}. Return to this window after verifying.
          </p>
          {error && <div className="home-copy-regular rounded-[0.8rem] bg-red-500/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-red-100">{error}</div>}
          <AuthPrimaryButton type="button" loading={loading} disabled={verificationComplete} onClick={handleSendVerification}>
            {loading ? "SENDING..." : verifyButtonText}
          </AuthPrimaryButton>
        </div>
      </>
    );
  }

  if (forgotPassword) {
    return (
      <>
        <MenuHeader title="RESET PASSWORD" onClose={onClose} onBack={() => { resetMessages(); setForgotPassword(false); }} authView authLogoBack={showLogoBack} />
        <form className="mt-2 space-y-1.5" onSubmit={handleForgotPassword}>
          <AuthTextInput
            icon={<AtIcon className="h-5 w-5" />}
            value={email}
            onChange={(e) => { resetMessages(); setEmail(e.target.value); }}
            placeholder="Confirm email address"
            type="text"
            inputMode="email"
            autoComplete="email"
          />
          {error && <div className="home-copy-regular rounded-[0.8rem] bg-red-500/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-red-100">{error}</div>}
          {success && <div className="home-copy-regular rounded-[0.8rem] bg-[#B7FF3C]/14 px-3 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-[#B7FF3C]">{success}</div>}
          <AuthPrimaryButton type="submit" loading={loading}>
            {loading ? "SENDING..." : "SEND RESET LINK"}
          </AuthPrimaryButton>
        </form>
      </>
    );
  }

  return (
    <>
      <MenuHeader title="CLUBHOUSE" onClose={onClose} onBack={onBack} authView authLogoBack={showLogoBack} />

      <div className="mt-2">
        <AuthTabs mode={mode} onChange={switchMode} />
      </div>

      <form onSubmit={handleSubmit} className="mt-2 space-y-1.5">
        {isSignup && (
          <AuthTextInput
            icon={<StarIcon className="h-5 w-5" />}
            value={nickname}
            onChange={(e) => { resetMessages(); setNickname(e.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 10)); }}
            placeholder="Username"
            maxLength={10}
            autoComplete="nickname"
          />
        )}

        <AuthTextInput
          icon={<AtIcon className="h-5 w-5" />}
          value={email}
          onChange={(e) => { resetMessages(); setEmail(e.target.value); }}
          placeholder="Email address"
          type="text"
          inputMode="email"
          autoComplete="email"
        />

        <AuthTextInput
          icon={<PadlockIcon className="h-5 w-5" />}
          value={password}
          onChange={(e) => { resetMessages(); setPassword(e.target.value); }}
          placeholder="Password"
          type={passwordVisible ? "text" : "password"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          rightAction={<PasswordVisibilityButton visible={passwordVisible} onToggle={() => setPasswordVisible((value) => !value)} />}
        />

        <AuthPrimaryButton type="submit" loading={loading}>
          {error || success || (loading ? "LOADING..." : isSignup ? "REGISTER" : "SIGN IN")}
        </AuthPrimaryButton>

        {isSignup && (
          <AuthEmailCommsCheckbox checked={emailOptIn} onChange={setEmailOptIn} />
        )}

        {!isSignup && (
          <AuthForgotPasswordButton onClick={() => { resetMessages(); setForgotPassword(true); }} />
        )}
      </form>
    </>
  );
}

export function MenuDropdown({
  onClose,
  onMatch,
  onFixtures,
  onGroups,
  onClubhouse,
  onTrophyCabinet,
  onLeaderboard,
  onRestart,
  onSignOut,
  canSignOut = false,
  onAuthComplete,
  initialView = "menu",
  initialAuthMode = "signin",
  authShowLogoBack = false,
  authRequestId = 0,
}) {
  const [view, setView] = useState(initialView || "menu");

  useEffect(() => {
    setView(initialView || "menu");
  }, [initialView, initialAuthMode, authShowLogoBack, authRequestId]);
  const handlers = { onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard };
  const authLabel = canSignOut ? "SIGN OUT" : "SIGN IN";
  const authActive = view === "auth";

  const openAuthPanel = () => {
    setView("auth");
  };

  const returnToMenu = () => {
    setView("menu");
  };

  const menu = (
    <div
      className="fixed inset-0 isolate flex items-start justify-center bg-[#031B12]/36 px-3 pb-4 pt-[70px] backdrop-blur-[2px]"
      style={{ zIndex: 2147483647 }}
    >
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 z-[0]" type="button" />

      <aside className={`pointer-events-auto relative z-[1] ${MENU_FRAME} text-[#F5F1E8] shadow-[0_24px_54px_rgba(0,0,0,0.32)]`}>
        <div
          className="absolute inset-0 rounded-[1.65rem] bg-[repeating-linear-gradient(90deg,#07542F_0px,#07542F_48px,#0B643A_48px,#0B643A_96px)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 rounded-[1.65rem] border border-[#F5F1E8]/12"
          aria-hidden="true"
        />

        <div className="relative p-4">
          {authActive ? (
            <AuthMenuPanel
              key={`${initialAuthMode}-${authShowLogoBack}-${authRequestId}`}
              onClose={onClose}
              onBack={returnToMenu}
              onAuthComplete={onAuthComplete}
              initialMode={initialAuthMode}
              showLogoBack={authShowLogoBack}
            />
          ) : (
            <>
              <MenuHeader title="MENU" onClose={onClose} />

              <div className="grid grid-cols-2 gap-2">
                {MENU_ITEMS.map((item) => (
                  <MenuTile
                    key={item.title}
                    title={item.title}
                    onClick={() => runAndClose(handlers[item.action], onClose)}
                  />
                ))}

                <MenuTile
                  title={authLabel}
                  variant="auth"
                  onClick={() => {
                    if (canSignOut) runAndClose(onSignOut, onClose);
                    else openAuthPanel();
                  }}
                />
                <MenuTile
                  title="RESET"
                  variant="danger"
                  onClick={() => runAndClose(onRestart, onClose)}
                />
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );

  if (typeof document === "undefined") return menu;
  return createPortal(menu, document.body);
}

export function HeaderMenuButton({ onClick, isOpen = false }) {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      className="absolute right-3 top-1/2 z-[2] flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#F5F0E6]"
      type="button"
    >
      {isOpen ? <CloseIcon small /> : <HamburgerIcon />}
    </button>
  );
}

export function ScreenTitle({
  children,
  menuOpen,
  menuInitialView = "menu",
  menuInitialAuthMode = "signin",
  menuAuthShowLogoBack = false,
  menuAuthRequestId = 0,
  onToggleMenu,
  onCloseMenu,
  onMatch,
  onFixtures,
  onGroups,
  onClubhouse,
  onTrophyCabinet,
  onLeaderboard,
  onRestart,
  onSignOut,
  canSignOut,
  onAuthComplete,
}) {
  return (
    <section className="relative z-[220] flex h-[54px] shrink-0 items-center justify-center overflow-visible bg-[#072D1D] px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      <span className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-10 w-10 -translate-y-1/2 items-center justify-center overflow-hidden">
        <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]" draggable={false} />
      </span>
      <h2 className="relative z-[1] home-copy-bold text-[clamp(25px,6.1vw,34px)] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">{children}</h2>
      <HeaderMenuButton onClick={menuOpen ? (onCloseMenu || onToggleMenu) : onToggleMenu} isOpen={menuOpen} />
      {menuOpen && (
        <MenuDropdown
          onClose={onCloseMenu || onToggleMenu}
          onMatch={onMatch}
          onFixtures={onFixtures}
          onGroups={onGroups}
          onClubhouse={onClubhouse}
          onTrophyCabinet={onTrophyCabinet}
          onLeaderboard={onLeaderboard}
          onRestart={onRestart}
          onSignOut={onSignOut}
          canSignOut={canSignOut}
          onAuthComplete={onAuthComplete}
          initialView={menuInitialView}
          initialAuthMode={menuInitialAuthMode}
          authShowLogoBack={menuAuthShowLogoBack}
          authRequestId={menuAuthRequestId}
        />
      )}
    </section>
  );
}
