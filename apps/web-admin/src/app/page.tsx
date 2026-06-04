'use client';

import { useEffect, useState } from 'react';
import {
  AppShell,
  Button,
  Card,
  TextInput,
} from '@knocksafe/ui/components';
import {
  adminLogin,
  createOrganization,
  createRep,
  listOrganizations,
  listReps,
} from '../lib/api';

const TOKEN_KEY = 'knocksafe_admin_token';

type Organization = { id: string; name: string };
type Rep = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  organizationId: string;
};

export default function AdminHomePage() {
  const [email, setEmail] = useState('admin@knocksafe.com');
  const [password, setPassword] = useState('Admin123!');
  const [token, setToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [orgName, setOrgName] = useState('');
  const [repForm, setRepForm] = useState({
    organizationId: '',
    email: '',
    password: 'Rep123!',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      setToken(saved);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([listOrganizations(token), listReps(token)])
      .then(([orgs, repsList]) => {
        setOrganizations(orgs);
        setReps(repsList);
        setRepForm((current) => ({
          ...current,
          organizationId: current.organizationId || orgs[0]?.id || '',
        }));
      })
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
      const result = await adminLogin(email, password);
      localStorage.setItem(TOKEN_KEY, result.accessToken);
      setToken(result.accessToken);
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrganization(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setMessage('');
    try {
      const created = await createOrganization(token, orgName);
      setOrganizations((current) => [...current, created]);
      setOrgName('');
      setMessage(`Organization "${created.name}" created`);
    } catch {
      setError('Could not create organization');
    }
  }

  async function handleCreateRep(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setMessage('');
    try {
      const created = await createRep(token, repForm);
      setReps((current) => [...current, created]);
      setMessage(`Rep ${created.firstName} ${created.lastName} created`);
      setRepForm((current) => ({
        ...current,
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create rep');
    }
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrganizations([]);
    setReps([]);
  }

  return (
    <AppShell
      title="Admin Console"
      subtitle="Manage organizations and sales reps"
      backgroundColor="#f0fdf4"
      footerLabel="Knocksafe POC · Admin Console"
    >
      {!token ? (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Admin sign in</h2>
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
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={handleLogout}>
              Sign out
            </Button>
          </div>

          {message ? <p style={{ color: '#047857', margin: 0 }}>{message}</p> : null}
          {error ? <p style={{ color: '#dc2626', margin: 0 }}>{error}</p> : null}

          <Card>
            <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Create organization</h2>
            <form onSubmit={handleCreateOrganization}>
              <TextInput label="Name" value={orgName} onChange={setOrgName} required />
              <Button type="submit">Create organization</Button>
            </form>
          </Card>

          <Card>
            <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Create rep</h2>
            <form onSubmit={handleCreateRep}>
              <label style={{ display: 'block', marginBottom: '1rem' }}>
                <span
                  style={{
                    display: 'block',
                    marginBottom: '0.35rem',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Organization
                </span>
                <select
                  value={repForm.organizationId}
                  onChange={(event) =>
                    setRepForm((current) => ({
                      ...current,
                      organizationId: event.target.value,
                    }))
                  }
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                  }}
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                label="Email"
                value={repForm.email}
                onChange={(value) => setRepForm((c) => ({ ...c, email: value }))}
                type="email"
                required
              />
              <TextInput
                label="Password"
                value={repForm.password}
                onChange={(value) => setRepForm((c) => ({ ...c, password: value }))}
                type="password"
                required
              />
              <TextInput
                label="First name"
                value={repForm.firstName}
                onChange={(value) => setRepForm((c) => ({ ...c, firstName: value }))}
                required
              />
              <TextInput
                label="Last name"
                value={repForm.lastName}
                onChange={(value) => setRepForm((c) => ({ ...c, lastName: value }))}
                required
              />
              <TextInput
                label="Phone"
                value={repForm.phone}
                onChange={(value) => setRepForm((c) => ({ ...c, phone: value }))}
              />
              <Button type="submit">Create rep</Button>
            </form>
          </Card>

          <Card>
            <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Organizations</h2>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {organizations.map((org) => (
                <li key={org.id}>{org.name}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 style={{ marginTop: 0, fontSize: '1.125rem' }}>Reps</h2>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {reps.map((rep) => (
                <li key={rep.id}>
                  {rep.firstName} {rep.lastName} · {rep.email}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
