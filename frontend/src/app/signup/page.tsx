import { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";

export const metadata: Metadata = {
  title: "Create Account | Vakiogiri AI",
  description: "Sign up to start generating viral shorts and clips with Vakiogiri AI.",
};

export default function SignupPage() {
  return <AuthCard initialMode="signup" />;
}
