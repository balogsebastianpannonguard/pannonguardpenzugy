import DirectLoginRedirect from "./DirectLoginRedirect";
import LoginForm from "./LoginForm";
import { findUserByDirectLoginToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : undefined;

  // Érvényes személyes linknél azonnal belépés; egyébként a rendes űrlap
  if (token && (await findUserByDirectLoginToken(token))) {
    return <DirectLoginRedirect token={token} />;
  }
  return <LoginForm />;
}
