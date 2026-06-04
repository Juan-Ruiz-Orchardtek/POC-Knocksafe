export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rep {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'rep';
  name?: string;
  repId?: string;
  organizationId?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'rep';
  repId?: string;
  organizationId?: string;
}
