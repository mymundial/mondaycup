import { useEffect, useRef, useState } from "react";
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
import { MC_COLORS, MC_SIZES, MC_TYPE } from "../../styles/theme.js";
import { AuthEmailCommsCheckbox, AuthForgotPasswordButton, AuthPrimaryButton, AuthTabs, AuthTextInput, PasswordVisibilityButton } from "../auth/AuthFormParts.jsx";

const MENU_ITEMS = [
  { title: "MATCH", action: "onMatch" },
  { title: "SCHEDULE", action: "onFixtures" },
  { title: "STANDINGS", action: "onGroups" },
  { title: "CLUBHOUSE", action: "onClubhouse" },
  { title: "TROPHIES", action: "onTrophyCabinet" },
  { title: "LEADERBOARD", action: "onLeaderboard" },
];

const MENU_TOP_OFFSET_PX = MC_SIZES.topBarHeight + 30;
const MENU_SAFE_HEIGHT_OFFSET_PX = MC_SIZES.topBarHeight + 50;

const MENU_FRAME =
  "w-full max-w-[408px] overflow-hidden rounded-[1.7rem]";

const MENU_HEADER =
  "relative mb-3 grid h-12 grid-cols-[44px_1fr_44px] items-center gap-2 px-0";

const MENU_TITLE_CLASS =
  "home-copy-bold text-[clamp(24px,5.7vw,30px)] uppercase leading-none tracking-[0.12em] text-[#F5F1E8]";

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
      strokeWidth="3"
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
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.1" />
      <path d="M16.1 8.1v5.2c0 1.2.7 2 1.8 2 1.5 0 2.6-1.6 2.6-3.6 0-4.7-3.4-8.2-8.2-8.2-5.2 0-8.8 3.8-8.8 8.8 0 5.1 3.8 8.2 8.9 8.2 1.7 0 3.2-.3 4.6-.9" />
    </svg>
  );
}

function PadlockIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function MenuActionIcon({ type = "default", className = "h-9 w-9" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "onMatch") {
    return (
      <svg viewBox="0 0 24 24" className={className} {...common}>
        <circle cx="12" cy="12" r="8.7" />
        <path d="M12 7.1l4 2.9-1.55 4.75h-4.9L8 10z" />
        <path d="M12 7.1V3.3" />
        <path d="M16 10l3.35-1.15" />
        <path d="M14.45 14.75l2.1 2.95" />
        <path d="M9.55 14.75l-2.1 2.95" />
        <path d="M8 10 4.65 8.85" />
        <path d="M7.45 17.7c1.25 1.05 2.82 1.65 4.55 1.65s3.3-.6 4.55-1.65" />
      </svg>
    );
  }
  if (type === "onFixtures") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><rect x="4" y="5" width="16" height="15" rx="2.6" /><path d="M8 3.8v3M16 3.8v3M4.8 9.2h14.4M8 13h3M13.5 13H16M8 16.5h3M13.5 16.5H16" /></svg>;
  }
  if (type === "onGroups") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M5 5.5h4.5v4H5zM5 14.5h4.5v4H5zM14.5 10h4.5v4h-4.5z" /><path d="M9.5 7.5h2.2c1.2 0 1.8.6 1.8 1.8v.7M9.5 16.5h2.2c1.2 0 1.8-.6 1.8-1.8V14M13.5 12h1" /></svg>;
  }
  if (type === "onClubhouse") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M4.5 20V9.5L12 4l7.5 5.5V20" /><path d="M8.5 20v-6.3h7V20M9 10.5h6" /></svg>;
  }
  if (type === "onTrophyCabinet") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M8 4h8v3.5c0 2.7-1.55 4.7-4 5.35-2.45-.65-4-2.65-4-5.35V4Z" /><path d="M8.15 6H5.5v1.2c0 2.05 1.15 3.55 3.25 4.05M15.85 6h2.65v1.2c0 2.05-1.15 3.55-3.25 4.05" /><path d="M12 13v3.2M8.8 20h6.4M10 16.2h4v2.2h-4z" /></svg>;
  }
  if (type === "onLeaderboard") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M6 19v-6h4v6M10 19V8h4v11M14 19v-9h4v9" /><path d="M4 20h16" /></svg>;
  }
  if (type === "auth") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><circle cx="12" cy="8" r="3.7" /><path d="M5.7 19.4c1-3 3.3-4.6 6.3-4.6s5.3 1.6 6.3 4.6" /></svg>;
  }
  if (type === "reset") {
    return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M5.5 7.5A7.7 7.7 0 1 1 4.7 16" /><path d="M5.5 3.8v3.7h3.7" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className={className} {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
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


function MenuTile({ title, onClick, variant = "primary", iconType = "default", featured = false, wide = false }) {
  const isDanger = variant === "danger";
  const isAuth = variant === "auth";

  if (wide) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`home-copy-bold flex h-[58px] w-full items-center justify-center gap-3 rounded-[1rem] border transition active:scale-[0.97] ${
          isAuth
            ? "border-[#F7D117]/75 bg-[#F7D117] text-[#052D1D] shadow-[0_10px_22px_rgba(0,0,0,0.20)]"
            : "border-[#F5F1E8]/70 bg-[#F5F1E8]/10 text-[#F5F1E8]"
        }`}
      >
        <MenuActionIcon type={iconType} className="h-5 w-5" />
        <span className="text-[14px] uppercase tracking-[0.1em]">{title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-square w-full flex-col items-center justify-center rounded-[1rem] transition active:scale-[0.97] ${
        isDanger
          ? "border border-[#B94135]/45 bg-[#B94135]/12 text-[#F5F1E8]"
          : "bg-[#F7D117] text-[#052D1D] shadow-[0_10px_22px_rgba(0,0,0,0.20),inset_0_2px_0_rgba(255,255,255,0.30)]"
      } ${featured ? "scale-[1.04] shadow-[0_13px_26px_rgba(0,0,0,0.24),0_0_18px_rgba(247,209,23,0.20)]" : ""}`}
    >
      <MenuActionIcon type={iconType} className="h-9 w-9" />
      <span className="mt-3 text-center home-copy-bold text-[11px] uppercase leading-none tracking-[0.075em]">{title}</span>
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

      <h2
        className={`${MENU_TITLE_CLASS} flex h-10 items-center justify-center text-center`}
        style={MC_TYPE.title}
      >
        {title}
      </h2>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="grid h-11 w-11 place-items-center justify-self-end text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]"
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
  const verifyNoticeTimerRef = useRef(null);
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    if (initialMode === "verify") {
      setMode("signin");
      const user = auth.currentUser;
      if (user) {
        setVerifyProfile({ accountStatus: { emailVerified: false, verificationRequired: true } });
        setVerifyUser(user);
        setVerifyButtonText("VERIFY YOUR EMAIL ADDRESS");
        setVerificationComplete(false);
      }
      return;
    }

    setMode(initialMode || "signin");
    setVerifyUser(null);
    setVerificationComplete(false);
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
      source: profile?.username ? "menu-signup" : "menu-auth",
      isSignup: Boolean(profile?.username),
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

  const showVerificationNotice = (message, nextButtonText = "RESEND VERIFICATION EMAIL", immediateButtonText = "PLEASE CHECK YOUR INBOX") => {
    if (verifyNoticeTimerRef.current) window.clearTimeout(verifyNoticeTimerRef.current);
    setError("");
    setSuccess("");
    setVerifyNoticeMessage(String(message || "").toUpperCase());
    setVerifyNoticeActive(true);
    if (immediateButtonText) setVerifyButtonText(immediateButtonText);
    verifyNoticeTimerRef.current = window.setTimeout(() => {
      setVerifyNoticeActive(false);
        if (nextButtonText) setVerifyButtonText(nextButtonText);
      verifyNoticeTimerRef.current = null;
    }, 5000);
  };

  const showVerificationInboxNotice = () => {
    showVerificationNotice("CHECK YOUR INBOX/SPAM/JUNK FOLDERS. RETURN TO THIS WINDOW AFTER VERIFYING.");
  };

  useEffect(() => {
    return () => {
      if (verifyNoticeTimerRef.current) window.clearTimeout(verifyNoticeTimerRef.current);
    };
  }, []);

  const authActionSettings = () => {
    if (typeof window === "undefined") return undefined;
    return {
      url: window.location.origin,
      handleCodeInApp: false,
    };
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
        setVerifyProfile(profile);
        setVerifyUser(cred.user);
        try {
          await sendEmailVerification(cred.user);
          showVerificationInboxNotice();
        } catch (verificationError) {
          const code = String(verificationError?.code || "");
          setVerifyButtonText("SEND VERIFICATION EMAIL");
          if (code.includes("too-many-requests")) showVerificationNotice("PLEASE WAIT BEFORE SENDING ANOTHER EMAIL", "SEND VERIFICATION EMAIL");
          else showVerificationNotice("ACCOUNT CREATED. TAP BELOW TO SEND VERIFICATION EMAIL", "SEND VERIFICATION EMAIL");
        }
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
      showVerificationInboxNotice();
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("too-many-requests")) showVerificationNotice("PLEASE WAIT BEFORE SENDING ANOTHER EMAIL", "RESEND VERIFICATION EMAIL");
      else showVerificationNotice(err?.message || "COULD NOT SEND VERIFICATION EMAIL", "RESEND VERIFICATION EMAIL");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    if (loading) return;
    resetMessages();

    const cleanEmail = email.trim().toLowerCase().replace(",", ".");
    if (!cleanEmail) {
      setError("Please enter your email address first");
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, cleanEmail, authActionSettings());
      setSuccess("If that email is registered, a password reset link has been sent");
    } catch (err) {
      const code = String(err?.code || "");
      if (code.includes("invalid-email")) setError("Please enter a valid email address");
      else if (code.includes("too-many-requests")) setError("Please wait before requesting another reset link");
      else setError("Could not send reset link please try again");
    } finally {
      setLoading(false);
    }
  }

  if (verifyUser) {
    return (
      <>
        <MenuHeader title="MONDAY CLUB" onClose={onClose} onBack={onBack} authView authLogoBack={showLogoBack} />
        <div className="mt-2 space-y-2 text-center">
          <div className="rounded-[1.18rem] border border-[#F5F1E8]/14 bg-[#031B12]/34 p-3 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
            <div className="home-copy-regular text-[20px] uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">VERIFY YOUR EMAIL</div>
            <p className="home-copy-regular mx-auto mt-4 max-w-[300px] text-[10px] uppercase leading-snug tracking-[0.07em] text-[#F5F1E8]/78">
              CHECK YOUR INBOX/SPAM/JUNK FOLDERS. RETURN TO THIS WINDOW AFTER VERIFYING.
            </p>
            <div className="mt-4">
              <AuthPrimaryButton type="button" loading={loading} disabled={verificationComplete} onClick={handleSendVerification}>
                {loading ? "SENDING..." : verifyButtonText}
              </AuthPrimaryButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (forgotPassword) {
    return (
      <>
        <MenuHeader title="RESET PASSWORD" onClose={onClose} onBack={() => { resetMessages(); setForgotPassword(false); }} authView authLogoBack={showLogoBack} />
        <form className="mt-3 space-y-2 rounded-[1.18rem] border border-[#F5F1E8]/14 bg-[#031B12]/34 p-3 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]" onSubmit={handleForgotPassword}>
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
      <MenuHeader title="MONDAY CLUB" onClose={onClose} onBack={onBack} authView authLogoBack={showLogoBack} />

      <div className="mt-2">
        <AuthTabs mode={mode} onChange={switchMode} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-[1.18rem] border border-[#F5F1E8]/14 bg-[#031B12]/34 p-3 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]">
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
          <AuthForgotPasswordButton onClick={() => { resetMessages(); setForgotPassword(true); }}>
            FORGOT PASSWORD?
          </AuthForgotPasswordButton>
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
  onShare,
  showShare = false,
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
  const handlers = { onMatch, onFixtures, onGroups, onClubhouse, onTrophyCabinet, onLeaderboard, onShare };
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
      className="fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#031B12]/45 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-[4px]"
      style={{
        zIndex: 2147483647,
      }}
    >
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 z-[0]" type="button" />

      <aside
        className={`pointer-events-auto relative z-[1] ${MENU_FRAME} border border-[#F5F1E8]/14 text-[#F5F1E8] shadow-[0_24px_54px_rgba(0,0,0,0.35)]`}
        style={{
          backgroundColor: "#0B5F35",
          backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)",
          backgroundSize: "100% 100%",
        }}
      >
        <div className="pointer-events-none absolute inset-0 rounded-[1.7rem] bg-[radial-gradient(circle_at_18%_8%,rgba(247,209,23,0.10),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.09))]" aria-hidden="true" />

        <div
          className="relative overflow-y-auto p-4"
          style={{ maxHeight: "calc(100dvh - 28px)" }}
        >
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

              <div className="space-y-2.5 rounded-[1.25rem] border border-[#F5F1E8]/12 bg-[#031B12]/20 p-3">
                <div className="grid grid-cols-3 gap-2.5 items-center">
                  <MenuTile title="MATCH" iconType="onMatch" onClick={() => runAndClose(onMatch, onClose)} />
                  <MenuTile title="SCHEDULE" iconType="onFixtures" onClick={() => runAndClose(onFixtures, onClose)} />
                  <MenuTile title="STANDINGS" iconType="onGroups" onClick={() => runAndClose(onGroups, onClose)} />
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <MenuTile title="CLUBHOUSE" iconType="onClubhouse" onClick={() => runAndClose(onClubhouse, onClose)} />
                  <MenuTile title="TROPHIES" iconType="onTrophyCabinet" onClick={() => runAndClose(onTrophyCabinet, onClose)} />
                  <MenuTile title="LEADERBOARD" iconType="onLeaderboard" onClick={() => runAndClose(onLeaderboard, onClose)} />
                </div>

              </div>

              <div className="mt-3 rounded-[1.15rem] border border-[#F5F1E8]/12 bg-[#031B12]/20 p-2.5">
                <MenuTile title={authLabel} variant="auth" iconType="auth" wide onClick={canSignOut ? () => runAndClose(onSignOut, onClose) : openAuthPanel} />
              </div>

              <div className="mt-2.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => runAndClose(onRestart, onClose)}
                  className="home-copy-bold inline-flex items-center justify-center gap-2 rounded-[0.9rem] border border-[#B94135]/45 bg-[#B94135]/10 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-[#F5F1E8]"
                >
                  <MenuActionIcon type="reset" className="h-5 w-5" />
                  RESET
                </button>
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
