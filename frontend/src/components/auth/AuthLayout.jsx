//frontend/src/components/auth/AuthLayout.jsx
import { useState } from 'react'
import logo from '../../assets/logo.png'

// ── Tokens ────────────────────────────────────────────────────────────────────
const GOLD  = 'rgba(201,161,92,0.16)'
const SAGE  = 'rgba(183,196,188,0.14)'
const FOREST = '#0E3B2E'

// ── Floating ambient icons ────────────────────────────────────────────────────
function FloatingIcons() {
  const icons = [
    // Coin — top left
    { x: '5%', y: '10%', delay: 0, dur: 24, anim: 'A',
      svg: <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
        <circle cx="30" cy="30" r="26" stroke={GOLD} strokeWidth="1.3"/>
        <circle cx="30" cy="30" r="18" stroke={GOLD} strokeWidth="1.3"/>
        <text x="30" y="36" textAnchor="middle" fontSize="15" fill={GOLD} fontFamily="serif">$</text>
      </svg> },
    // Trend line — top right
    { x: '80%', y: '7%', delay: 5, dur: 28, anim: 'B',
      svg: <svg width="80" height="48" viewBox="0 0 80 48" fill="none">
        <polyline points="4,42 20,28 36,34 52,16 76,6" stroke={GOLD} strokeWidth="1.3" strokeLinejoin="round"/>
        {[4,20,36,52,76].map((cx,i) => <circle key={i} cx={cx} cy={[42,28,34,16,6][i]} r="2.5" stroke={GOLD} strokeWidth="1.3"/>)}
      </svg> },
    // Ledger — bottom left
    { x: '3%', y: '70%', delay: 9, dur: 22, anim: 'C',
      svg: <svg width="46" height="58" viewBox="0 0 46 58" fill="none">
        <rect x="3" y="3" width="40" height="52" rx="4" stroke={SAGE} strokeWidth="1.3"/>
        {[16,24,32,40].map((y,i) => <line key={i} x1="11" y1={y} x2={i < 2 ? 35 : i === 2 ? 28 : 22} y2={y} stroke={SAGE} strokeWidth="1.3"/>)}
      </svg> },
    // Bar chart — bottom right
    { x: '85%', y: '68%', delay: 14, dur: 26, anim: 'A',
      svg: <svg width="62" height="54" viewBox="0 0 62 54" fill="none">
        <rect x="3"  y="30" width="11" height="20" rx="2" stroke={SAGE} strokeWidth="1.3"/>
        <rect x="18" y="18" width="11" height="32" rx="2" stroke={SAGE} strokeWidth="1.3"/>
        <rect x="33" y="8"  width="11" height="42" rx="2" stroke={GOLD} strokeWidth="1.3"/>
        <rect x="48" y="22" width="9"  height="28" rx="2" stroke={SAGE} strokeWidth="1.3"/>
      </svg> },
    // Progress ring — mid left
    { x: '1%', y: '42%', delay: 3, dur: 30, anim: 'B',
      svg: <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
        <circle cx="25" cy="25" r="21" stroke={SAGE} strokeWidth="1.3"/>
        <path d="M25 6 A19 19 0 0 1 44 25" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="25" y1="25" x2="25" y2="9"  stroke={SAGE} strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="25" y1="25" x2="37" y2="31" stroke={SAGE} strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="25" cy="25" r="2" fill={SAGE}/>
      </svg> },
    // Growth path — bottom center
    { x: '58%', y: '80%', delay: 18, dur: 25, anim: 'C',
      svg: <svg width="70" height="38" viewBox="0 0 70 38" fill="none">
        <path d="M3 34 C14 34 14 18 26 18 C38 18 38 6 50 6 C58 6 62 10 66 6" stroke={GOLD} strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M3 34 C14 34 14 18 26 18 C38 18 38 6 50 6 C58 6 62 10 66 6 L66 38 L3 38 Z" fill={GOLD} fillOpacity="0.04"/>
      </svg> },
  ]

  return (
    <>
      <style>{`
        @keyframes floatA{0%,100%{transform:translateY(0px) rotate(0deg)}50%{transform:translateY(-20px) rotate(3deg)}}
        @keyframes floatB{0%,100%{transform:translateY(0px) rotate(0deg)}50%{transform:translateY(-18px) rotate(-3deg)}}
        @keyframes floatC{0%,100%{transform:translateY(0px) rotate(0deg)}50%{transform:translateY(-22px) rotate(4deg)}}
      `}</style>
      {icons.map((ic, i) => (
        <div key={i} style={{
          position: 'fixed', left: ic.x, top: ic.y,
          zIndex: 0, pointerEvents: 'none',
          animation: `float${ic.anim} ${ic.dur}s ease-in-out ${ic.delay}s infinite`,
        }}>
          {ic.svg}
        </div>
      ))}
    </>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: `
          radial-gradient(circle at 80% 100%, rgba(14,59,46,0.5) 0%, rgba(14,59,46,0) 50%),
          linear-gradient(160deg, #061A14 0%, #0A2820 60%, #0E3B2E 100%)
        `,
      }} />

      {/* Watermark */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: 'clamp(72px, 18vw, 210px)',
          fontWeight: 600, color: 'rgba(255,255,255,0.045)',
          userSelect: 'none', whiteSpace: 'nowrap', letterSpacing: '-0.02em',
        }}>FinText</span>
      </div>

      <FloatingIcons />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  )
}


// ── Brand lockup ──────────────────────────────────────────────────────────────
export function BrandLockup({ title, subtitle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
      <img src={logo} alt="FinText" style={{
        width: 64, height: 64, borderRadius: 14, objectFit: 'cover',
        marginBottom: 18,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }} />
      <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 500, color: '#fff', margin: '0 0 6px 0', textAlign: 'center' }}>
        {title}
      </h1>
      <p style={{ fontSize: 13.5, color: '#9AABA4', margin: 0, textAlign: 'center' }}>{subtitle}</p>
    </div>
  )
}

// ── White card ────────────────────────────────────────────────────────────────
export function AuthCard({ children, maxWidth = 460 }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 18,
      boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
      padding: '36px 40px', width: '100%', maxWidth,
    }}>
      {children}
    </div>
  )
}

// ── Shared label / section label ──────────────────────────────────────────────
export const labelStyle    = { fontSize: 13, fontWeight: 600, color: '#3D4F47', display: 'block', marginBottom: 5 }
export const sectionLabel  = { fontSize: 11, fontWeight: 700, color: FOREST, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '8px 0 12px' }

// ── Controlled input ──────────────────────────────────────────────────────────
export function AuthInput({ label, error, success, rightSlot, containerStyle, inputStyle: extraInputStyle, ...props }) {
  const [focused, setFocused] = useState(false)
  const border = error ? '#9C4B3E' : success ? FOREST : focused ? FOREST : '#DDE5E1'
  const shadow = focused ? `0 0 0 3px ${error ? 'rgba(156,75,62,0.08)' : 'rgba(14,59,46,0.08)'}` : 'none'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...containerStyle }}>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#F4F7F5', border: `1px solid ${border}`,
            borderRadius: 10, padding: '11px 14px',
            paddingRight: rightSlot ? 44 : 14,
            fontSize: 14, color: '#1A2420', outline: 'none',
            boxShadow: shadow, transition: 'border-color 0.15s, box-shadow 0.15s',
            fontFamily: 'inherit',
            ...extraInputStyle,
          }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
export function AuthSelect({ label, children, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <select
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#F4F7F5', border: `1px solid ${focused ? FOREST : '#DDE5E1'}`,
          borderRadius: 10, padding: '11px 14px',
          fontSize: 14, color: '#1A2420', outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(14,59,46,0.08)' : 'none',
          transition: 'border-color 0.15s', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        {children}
      </select>
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function AuthTextarea({ label, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={labelStyle}>{label}</label>}
      <textarea
        {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e) }}
        onBlur={e => { setFocused(false); props.onBlur?.(e) }}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#F4F7F5', border: `1px solid ${focused ? FOREST : '#DDE5E1'}`,
          borderRadius: 10, padding: '11px 14px',
          fontSize: 14, color: '#1A2420', outline: 'none', resize: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(14,59,46,0.08)' : 'none',
          transition: 'border-color 0.15s', fontFamily: 'inherit', lineHeight: 1.6,
        }}
      />
    </div>
  )
}

// ── Submit button ─────────────────────────────────────────────────────────────
export function AuthButton({ children, loading, disabled, type = 'submit', onClick }) {
  const inactive = loading || disabled
  return (
    <button type={type} disabled={inactive} onClick={onClick} style={{
      width: '100%', padding: '13px',
      background: inactive ? '#5A8A76' : FOREST,
      color: '#fff', border: 'none', borderRadius: 10,
      fontSize: 14, fontWeight: 600,
      cursor: inactive ? 'not-allowed' : 'pointer',
      transition: 'background 0.15s',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {loading ? (
        <>
          <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M12 2 A10 10 0 0 1 22 12" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          {typeof loading === 'string' ? loading : 'Loading…'}
        </>
      ) : children}
    </button>
  )
}

// ── OAuth buttons ─────────────────────────────────────────────────────────────
export function OAuthButtons({ onGoogle, onApple }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
      <button type="button" onClick={onGoogle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: '#fff', border: '1px solid #DDE5E1', borderRadius: 10,
        padding: '11px 14px', fontSize: 14, fontWeight: 500, color: '#1A2420', cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#F4F7F5'}
        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continue with Google
      </button>
      <button type="button" onClick={onApple} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: '#0A2820', border: '1px solid #1A4030', borderRadius: 10,
        padding: '11px 14px', fontSize: 14, fontWeight: 500, color: '#fff', cursor: 'pointer',
      }}
        onMouseEnter={e => e.currentTarget.style.background = '#0E3B2E'}
        onMouseLeave={e => e.currentTarget.style.background = '#0A2820'}
      >
        <svg width="16" height="18" viewBox="0 0 814 1000" fill="white">
          <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.8 0 108.2 2.6 168.6 71.9zm-174.5-89.3c-27.5-32.5-64.7-58.1-116.9-58.1-8.3 0-16.6.6-24.9 1.9 1.3-8.3 1.9-16.6 1.9-24.9 0-71.9-30.2-147.9-86.1-197.3C343.5 24.2 296.4 0 248.2 0c-1.3 0-2.6 0-3.9.6 1.3 9.6 1.9 19.2 1.9 28.8 0 68.1-26.9 140.6-75.3 191.7-43.4 46.4-103.1 74.6-163.4 74.6 0 1.3-.6 2.6-.6 3.9 0 58.7 18.6 115.1 52.4 162.2 38.2 52.4 96.2 87.5 158.4 87.5 30.2 0 58.7-9.6 86.1-19.2 27.5-9.6 55-19.2 82.5-19.2 27.5 0 55 9.6 82.5 19.2 27.5 9.6 55 19.2 86.1 19.2 62.2 0 120.2-35.1 158.4-87.5 33.8-47.1 52.4-103.5 52.4-162.2 0-1.3-.6-2.6-.6-3.9-51.7 0-100.7-22.3-136.4-55.5z"/>
        </svg>
        Continue with Apple
      </button>
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function AuthDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 20px' }}>
      <div style={{ flex: 1, height: 1, background: '#E8EDEB' }} />
      <span style={{ fontSize: 12, color: '#9AABA4', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#E8EDEB' }} />
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function AuthFooter({ linkTo, linkLabel, preText, postText }) {
  return (
    <p style={{ textAlign: 'center', fontSize: 13, color: '#9AABA4', margin: '20px 0 0' }}>
      {preText}{' '}
      <a href={linkTo} style={{ color: '#C9A15C', fontWeight: 700, textDecoration: 'none' }}>{linkLabel}</a>
      {postText && <>{' '}{postText}</>}
    </p>
  )
}

export function AuthBranding() {
  return (
    <p style={{ textAlign: 'center', fontSize: 12, color: '#4A6358', margin: '14px 0 0' }}>
      FinText &middot; Powered by <span style={{ fontWeight: 600 }}>Mitch Hub</span>
    </p>
  )
}
