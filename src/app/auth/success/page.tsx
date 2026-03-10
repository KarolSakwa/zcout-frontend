import AuthSuccessClient from './AuthSuccessClient';

export default async function AuthSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const next = resolvedSearchParams.next || '/duels';

  return <AuthSuccessClient next={next} />;
}