import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: '#111827',
    color: '#ffffff',
    border: '1px solid #111827',
  },
  secondary: {
    backgroundColor: '#ffffff',
    color: '#111827',
    border: '1px solid #d1d5db',
  },
  danger: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: '1px solid #dc2626',
  },
};

export function Button({
  variant = 'primary',
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.6 : 1,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      style={{
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 0',
        marginBottom: '1.5rem',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title}</h1>
      {subtitle ? (
        <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}

export interface FooterProps {
  label?: string;
}

export function Footer({ label = 'Knocksafe POC' }: FooterProps) {
  return (
    <footer
      style={{
        borderTop: '1px solid #e5e7eb',
        marginTop: '2rem',
        paddingTop: '1rem',
        color: '#9ca3af',
        fontSize: '0.75rem',
        textAlign: 'center',
      }}
    >
      {label}
    </footer>
  );
}

export interface AppShellProps {
  title: string;
  subtitle?: string;
  backgroundColor: string;
  children: ReactNode;
  footerLabel?: string;
}

export function AppShell({
  title,
  subtitle,
  backgroundColor,
  children,
  footerLabel,
}: AppShellProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor,
        color: '#111827',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem' }}>
        <Header title={title} subtitle={subtitle} />
        <main>{children}</main>
        <Footer label={footerLabel} />
      </div>
    </div>
  );
}

export interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1.25rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {children}
    </div>
  );
}

export interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: TextInputProps) {
  return (
    <label style={{ display: 'block', marginBottom: '1rem' }}>
      <span
        style={{
          display: 'block',
          marginBottom: '0.35rem',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid #d1d5db',
          fontSize: '0.875rem',
          boxSizing: 'border-box',
        }}
      />
    </label>
  );
}
