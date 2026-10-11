import "server-only";
import { db } from "@/lib/db/client";
// Called only after Supabase verifies the email/password session or email token.
// Using auth.users.id as buyers.id preserves the shared Order.buyerId contract.
export async function ensureBuyer(user: { id: string; email?: string }) {
  if (!user.email) throw new Error("A buyer email is required.");
  const { error } = await db()
    .from("buyers")
    .upsert(
      { id: user.id, email: user.email },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error)
    throw new Error(
      "Could not create the buyer profile. Please contact the team.",
    );
}
