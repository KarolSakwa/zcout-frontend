import AuthSuccessClient from './AuthSuccessClient';

export default async function AuthSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; redirect?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawNext = resolvedSearchParams.next ?? resolvedSearchParams.redirect ?? '/duels';
  const next = rawNext.startsWith('/') ? rawNext : '/duels';

  return <AuthSuccessClient next={next} />;
}