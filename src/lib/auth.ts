// ============================================================
// Strapped Admin - NextAuth Configuration
// ============================================================

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getUserByUsername } from './data';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = getUserByUsername(credentials.username);
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
          permissions: user.permissions || [],
        } as { id: string; name: string; email: string; role: string; permissions: string[] };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.username = user.email;
        token.permissions = (user as any).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string; username?: string; permissions?: string[] }).id = token.sub;
        (session.user as { id?: string; role?: string; username?: string; permissions?: string[] }).role = token.role as string;
        (session.user as { id?: string; role?: string; username?: string; permissions?: string[] }).username = token.username as string;
        (session.user as { id?: string; role?: string; username?: string; permissions?: string[] }).permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'strapped-admin-secret-key-change-in-production',
};
