import { AuthForm } from "@/components/buyer/auth-form";
export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <AuthForm mode="signup" error={(await searchParams).error} />;
}
