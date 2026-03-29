import AttributeRankingPage from '../[attributeKey]/page';

export default function RankingsIndexPage({
  searchParams,
}: {
  searchParams?: { limit?: string; position?: string; search?: string };
}) {
  return AttributeRankingPage({
    params: { attributeKey: 'overall' },
    searchParams: searchParams ?? {},
  });
}