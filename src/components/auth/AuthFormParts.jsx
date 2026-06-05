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
        -webkit-box-shadow: 0 0 0 1000px ${MC_COLORS.ivory} inset !important;
        -webkit-text-fill-color: ${MC_COLORS.greenDark} !important;
        caret-color: ${MC_COLORS.greenDark} !important;
        transition: background-color 99999s ease-in-out 0s !important;
      }
      .mc-auth-input-field::selection {
        background: rgba(247, 209, 23, 0.28);
        color: ${MC_COLORS.greenDark};
      }
    `}</style>
  );
}

export function AuthTabs({ mode, onModeChange, onChange }) {
  const activeMode = String(mode || '').toLowerCase();
  const normalisedMode = activeMode === 'signup' || activeMode === 'sign-up' || activeMode === 'register' ? 'signup' : 'signin';
  const handleChange = (nextMode) => (onModeChange || onChange)?.(nextMode);

  return (
    <SegmentedTabs
      value={normalisedMode}
      onChange={handleChange}
      options={[
        { value: 'signin', label: 'SIGN IN' },
        { value: 'signup', label: 'SIGN UP' },
      ]}
      style={{ maxWidth: '100%', background: MC_COLORS.greenPanelSolid }}
    />
  );
}

export function AuthInput({ icon, right, rightAction, style, inputStyle, className = '', ...props }) {
  const suffix = right ?? rightAction;
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '38px',
        borderRadius: MC_SIZES.pillRadius,
        background: MC_COLORS.ivory,
        color: MC_COLORS.greenDark,
        display: 'grid',
        gridTemplateColumns: icon ? '34px 1fr auto' : '12px 1fr auto',
        alignItems: 'center',
        padding: '0 12px 0 7px',
        boxShadow: 'inset 0 0 0 1px rgba(6,53,31,0.10)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <AuthAutofillFix />
      <div style={{ display: 'grid', placeItems: 'center', opacity: 1, color: MC_COLORS.greenDark }}>{icon}</div>
      <input
        {...props}
        className="mc-auth-input-field"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          outline: 0,
          background: MC_COLORS.ivory,
          color: MC_COLORS.greenDark,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'none',
          ...inputStyle,
        }}
      />
      {suffix ? <div style={{ display: 'grid', placeItems: 'center', color: MC_COLORS.greenDark }}>{suffix}</div> : null}
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
        color: MC_COLORS.greenDark,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
