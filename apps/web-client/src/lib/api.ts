const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? 'http://localhost:3001';
const repsUrl = process.env.NEXT_PUBLIC_REPS_SERVICE_URL ?? 'http://localhost:3003';

export async function repLogin(email: string, password: string) {
  const response = await fetch(`${authUrl}/auth/rep/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  return response.json() as Promise<{
    accessToken: string;
    user: { id: string; email: string; name?: string; role: string };
  }>;
}

export async function getRepProfile(token: string) {
  const response = await fetch(`${repsUrl}/reps/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to load profile');
  }

  return response.json();
}
