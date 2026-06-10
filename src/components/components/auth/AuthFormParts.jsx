import React from 'react';
import { MC_COLORS, MC_SIZES, MC_TYPE } from '../../styles/theme.js';
import YellowButton from '../ui/YellowButton.jsx';
import SegmentedTabs from '../ui/SegmentedTabs.jsx';

function AuthAutofillFix() {
  return (
    <style>{`
      .mc-auth-input-field:-webkit-autofill,
      .mc-auth-input-field:-webkit-autofill:hover,
      .mc-auth-input-field:-webkit-autofill:focus,
      .mc-auth-input-field:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px rgba(5,45,29,0.62) inset !important;
        -webkit-text-fill-color: ${MC_COLORS.ivory} !important;
        caret-color: ${MC_COLORS.ivory} !important;
        transition: background-color 99999s ease-in-out 0s !important;
      }
      .mc-auth-input-field::placeholder {
        color: rgba(245,241,232,0.54);
      }
      .mc-auth-input-field::selection {
        background: rgba(247, 209, 23, 0.28);
        color: ${MC_COLORS.ivory};
      }
    `}</style>
  );
}

export function AuthTabs({ mode, onModeChange, onChange }) {
  const activeMode = String(mode || '').toLowerCase();
  const normalisedMode = activeMode === 'signup' || activeMode === 'sign-up' || activeMode === 'register' ? 'signup' : 'signin';
  const handleChange = (nextMode) => (onModeChange || onChange)?.(nextMode);
  const items = [
    { value: 'signin', label: 'SIGN IN' },
    { value: 'signup', label: 'SIGN UP' },
  ];

  return (
    <div
      role="tablist"
      aria-label="Authentication mode"
      style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 4,
        padding: 4,
        borderRadius: 16,
        border: '1px solid rgba(245,241,232,0.14)',
        background: 'rgba(3,27,18,0.34)',
        boxShadow: 'inset 0 1px 0 rgba(245,241,232,0.06), 0 8px 20px rgba(0,0,0,0.14)',
      }}
    >
      {items.map((item) => {
        const active = item.value === normalisedMode;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => handleChange(item.value)}
            className="home-copy-bold"
            style={{
              height: 34,
              border: 0,
              borderRadius: 12,
              background: active ? MC_COLORS.yellow : 'transparent',
              color: active ? MC_COLORS.greenDark : MC_COLORS.ivory,
              fontSize: 13,
              letterSpacing: '0.08em',
              lineHeight: 1,
              textTransform: 'uppercase',
              boxShadow: active ? '0 0 12px rgba(247,209,23,0.24), inset 0 2px 0 rgba(255,255,255,0.26)' : 'none',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function AuthInput({ icon, right, rightAction, style, inputStyle, className = '', ...props }) {
  const suffix = right ?? rightAction;
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '40px',
        borderRadius: MC_SIZES.pillRadius,
        background: 'rgba(5,45,29,0.54)',
        color: MC_COLORS.ivory,
        display: 'grid',
        gridTemplateColumns: icon ? '34px 1fr auto' : '12px 1fr auto',
        alignItems: 'center',
        padding: '0 12px 0 7px',
        boxShadow: 'inset 0 0 0 1px rgba(245,241,232,0.16), inset 0 1px 0 rgba(245,241,232,0.06), 0 6px 14px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <AuthAutofillFix />
      <div style={{ display: 'grid', placeItems: 'center', opacity: 0.82, color: MC_COLORS.ivory }}>{icon}</div>
      <input
        {...props}
        className="mc-auth-input-field"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          outline: 0,
          background: 'transparent',
          color: MC_COLORS.ivory,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'none',
          ...inputStyle,
        }}
      />
      {suffix ? <div style={{ display: 'grid', placeItems: 'center', color: MC_COLORS.ivory }}>{suffix}</div> : null}
    </div>
  );
}

export function AuthCheckbox({ checked, onChange, label = 'Receive email communications' }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        color: MC_COLORS.ivory,
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: '0.03em',
        opacity: 0.72,
        lineHeight: 1.2,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange?.(event.target.checked)}
        style={{ width: 12, height: 12, accentColor: MC_COLORS.yellow }}
      />
      <span>{label}</span>
    </label>
  );
}

export function ForgotPasswordLink({ onClick, children = 'Forgot Password' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        border: 0,
        background: 'transparent',
        color: MC_COLORS.ivory,
        opacity: 0.72,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.04em',
        textAlign: 'center',
        cursor: 'pointer',
        padding: '2px 0 0',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  );
}

export function AuthSubmitButton(props) {
  return <YellowButton type="submit" {...props} />;
}

export function PasswordVisibilityButton({ visible = false, onToggle }) {
  return (
    <button
      type="button"
      aria-label={visible ? 'Hide password' : 'Show password'}
      onClick={onToggle}
      style={{
        width: 30,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        border: 0,
        background: 'transparent',
        color: MC_COLORS.ivory,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {visible ? (
          <>
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M3 3l18 18" />
            <path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a18 18 0 0 1-2.7 3.7" />
            <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7c1.6 0 3-.4 4.2-1" />
            <path d="M10.2 10.2a3 3 0 0 0 3.6 3.6" />
          </>
        )}
      </svg>
    </button>
  );
}

export const authTitleStyle = {
  color: MC_COLORS.ivory,
  fontSize: 21,
  textAlign: 'center',
  ...MC_TYPE.title,
};

// Compatibility exports used by the existing pages while the shared auth component migration continues.
export const AuthTextInput = AuthInput;
export const AuthPrimaryButton = AuthSubmitButton;
export const AuthEmailCommsCheckbox = AuthCheckbox;
export const AuthForgotPasswordButton = ForgotPasswordLink;
