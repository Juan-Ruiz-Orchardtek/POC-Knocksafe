const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? 'http://localhost:3001';
const orgsUrl = process.env.NEXT_PUBLIC_ORGS_SERVICE_URL ?? 'http://localhost:3002';
const repsUrl = process.env.NEXT_PUBLIC_REPS_SERVICE_URL ?? 'http://localhost:3003';

export async function adminLogin(email: string, password: string) {
  const response = await fetch(`${authUrl}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  return response.json() as Promise<{ accessToken: string }>;
}

export async function listOrganizations(token: string) {
  const response = await fetch(`${orgsUrl}/organizations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Unable to load organizations');
  }
  return response.json();
}

export async function createOrganization(token: string, name: string) {
  const response = await fetch(`${orgsUrl}/organizations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error('Unable to create organization');
  }
  return response.json();
}

export async function listReps(token: string) {
  const response = await fetch(`${repsUrl}/reps`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error('Unable to load reps');
  }
  return response.json();
}

export async function createRep(
  token: string,
  payload: {
    organizationId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  },
) {
  const response = await fetch(`${repsUrl}/reps`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Unable to create rep');
  }
  return response.json();
}
