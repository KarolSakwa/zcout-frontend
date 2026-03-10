import AttributeRankingPage from '../[attributeKey]/page';

export default function RankingsIndexPage() {
  return AttributeRankingPage({
    params: { attributeKey: 'dribbling' },
    searchParams: {},
  });
}