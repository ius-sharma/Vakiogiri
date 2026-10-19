import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Log in | Vakiogiri AI",
  description: "Sign in to access your Vakiogiri AI Studio and saved clips.",
};

export default function LoginPage() {
  return <AuthCard initialMode="login" />;
}
