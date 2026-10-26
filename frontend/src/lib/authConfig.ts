/**
 * Authentication Configuration & Creator Access Whitelist
 * Only authorized emails can authenticate during private development/beta.
 */

export const AUTHORIZED_EMAILS: string[] = [
  "risewithius@gmail.com",
  ...(process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS
    ? process.env.NEXT_PUBLIC_AUTHORIZED_EMAILS.split(",").map((e) => e.trim().toLowerCase())
    : []),
].map((e) => e.trim().toLowerCase());

export const isAuthorizedEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return AUTHORIZED_EMAILS.includes(email.trim().toLowerCase());
};

export const UNAUTHORIZED_ACCESS_MESSAGE =
  "Access restricted to authorized creator (risewithius@gmail.com). Private beta is currently locked.";
