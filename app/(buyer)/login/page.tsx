import { AuthForm } from "@/components/buyer/auth-form";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="login"
      error={params.error}
      next={params.next}
      confirm={params.notice === "confirm"}
    />
  );
}
