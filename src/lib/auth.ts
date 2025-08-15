import NextAuth, { NextAuthOptions, User, Account, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { sql } from '@/lib/db'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const users = await sql`SELECT * FROM "User" WHERE "email" = ${credentials.email}`;
        if (users.length === 0) {
          return null;
        }
        const user = users[0];

        if (!user.password) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role || 'user',
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async signIn({ user, account }: { user: User; account: Account | null }) {
      if (account?.provider === 'google') {
        try {
          const users = await sql`SELECT * FROM "User" WHERE "email" = ${user.email}`;
          let userId;

          if (users.length === 0) {
            // If user doesn't exist, create a new user
            userId = randomUUID();
            await sql`INSERT INTO "User" (id, name, email, image, "emailVerified", role) VALUES (${userId}, ${user.name}, ${user.email}, ${user.image}, ${new Date().toISOString()}, 'user')`;
          } else {
            userId = users[0].id;
          }

          // Check if the account is already linked
          const accounts = await sql`SELECT * FROM "Account" WHERE "provider" = 'google' AND "providerAccountId" = ${account.providerAccountId}`;
          if (accounts.length === 0) {
            // If account is not linked, create a new account
            const accountId = randomUUID();
            await sql`INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId", access_token, id_token) VALUES (${accountId}, ${userId}, ${account.type}, ${account.provider}, ${account.providerAccountId}, ${account.access_token}, ${account.id_token})`;
          }
          return true; // Allow sign in
        } catch (error) {
          console.error("SIGN_IN_CALLBACK_ERROR", error);
          return false; // Prevent sign in on error
        }
      }
      return true; // Allow sign in for other providers
    },
    async jwt({ token, user }: { token: JWT; user: User }) {
      if (user) {
        // On sign in, `user` object is available. We need to fetch the ID from DB if it's not there.
        if (!token.id) {
            const dbUsers = await sql`SELECT id, role FROM "User" WHERE email = ${user.email}`;
            if (dbUsers.length > 0) {
                token.id = dbUsers[0].id;
                token.role = dbUsers[0].role || 'user';
            }
        }
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as 'user' | 'admin'
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
