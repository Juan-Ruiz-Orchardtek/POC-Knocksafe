'use client';

import { useEffect, useState } from 'react';
import {
  AppShell,
  Button,
  Card,
  TextInput,
} from '@knocksafe/ui/components';
import { getRepProfile, repLogin } from '../lib/api';

const TOKEN_KEY = 'knocksafe_rep_token';

export default function ClientHomePage() {
  const [email, setEmail] = useState('rep@knocksafe.com');
  const [password, setPassword] = useState('Rep123!');
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      return;
    }

    getRepProfile(token)
      .then(setProfile)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setError('Session expired. Please sign in again.');
      });
  }, [token]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await repLogin(email, password);
      localStorage.setItem(TOKEN_KEY, result.accessToken);
      setToken(result.accessToken);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProfile(null);
  }

  return (
    <AppShell
      title="Rep Portal"
      subtitle="Sales rep login and profile"
      backgroundColor="#eef6ff"
      footerLabel="Knocksafe POC · Rep Portal"
    >
      {!token ? (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Sign in</h2>
          <form onSubmit={handleLogin}>
            <TextInput label="Email" value={email} onChange={setEmail} type="email" required />
            <TextInput
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              required
            />
            {error ? <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>
      ) : (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>My profile</h2>
            <Button variant="secondary" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
          {profile ? (
            <dl style={{ margin: 0, display: 'grid', gap: '0.75rem' }}>
              <div>
                <dt style={{ color: '#6b7280', fontSize: '0.75rem' }}>Name</dt>
                <dd style={{ margin: 0 }}>
                  {String(profile['firstName'])} {String(profile['lastName'])}
                </dd>
              </div>
              <div>
                <dt style={{ color: '#6b7280', fontSize: '0.75rem' }}>Email</dt>
                <dd style={{ margin: 0 }}>{String(profile['email'])}</dd>
              </div>
              <div>
                <dt style={{ color: '#6b7280', fontSize: '0.75rem' }}>Phone</dt>
                <dd style={{ margin: 0 }}>{String(profile['phone'] ?? '—')}</dd>
              </div>
              <div>
                <dt style={{ color: '#6b7280', fontSize: '0.75rem' }}>Organization</dt>
                <dd style={{ margin: 0 }}>
                  {profile['organization']
                    ? String((profile['organization'] as { name: string }).name)
                    : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <p>Loading profile...</p>
          )}
        </Card>
      )}
    </AppShell>
  );
}
