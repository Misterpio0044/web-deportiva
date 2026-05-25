import jwt from 'jsonwebtoken';

export interface SignTokenInput {
  sub: number;
  role?: 'admin' | 'user';
  email?: string | null;
  firstname?: string;
}

export function signTestToken(input: SignTokenInput): string {
  return jwt.sign(
    {
      sub: input.sub,
      email: input.email ?? 'test@example.com',
      role: input.role ?? 'user',
      firstname: input.firstname ?? 'Test',
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );
}
