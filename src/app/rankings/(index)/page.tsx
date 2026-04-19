import AttributeRankingPage from '../[attributeKey]/page'

export default async function RankingsIndexPage({
  searchParams,
}: {
  searchParams?: Promise<{ limit?: string; position?: string; search?: string }>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}

  return AttributeRankingPage({
    params: { attributeKey: 'overall' },
    searchParams: resolvedSearchParams,
  })
}