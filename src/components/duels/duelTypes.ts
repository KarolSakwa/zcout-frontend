export type Player = {
  id: number;
  name: string;
  position: string;
  club?: string | null;
  nation?: string | null;
  seedRating?: number;
  avatarSrc?: string;
  countryIso2?: string | null;
  color?: string;
  secondaryColor?: string;
  number?: number;
};

export type PairResponse = {
  pair_id: string | number | null;
  attribute: string;
  left: Player;
  right: Player;
  attributeLabel?: string;
};

export type VoteApiResponse = {
  duel_id: number;
  attribute_id: number;
  players: Array<{
    id: number;
    rating: number;
    rating_before: number;
    rating_after: number;
    delta: number;
    votes_count: number;
    attribute_rank: number | null;
    is_top_ten: boolean;
  }>;
};

export type RatingImpact = {
  rating: number;
  rating_before: number;
  rating_after: number;
  delta: number;
  votes_count: number;
  attribute_rank: number | null;
  is_top_ten: boolean;
};

export type RatingsMap = Record<string, RatingImpact>;