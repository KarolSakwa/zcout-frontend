export type FeaturedRankingTileIcon =
  | { type: "star" }
  | { type: "attribute"; key: string };

export type FeaturedRankingTile = {
  id: string;
  href: string;
  titleLine1: string;
  titleLine2: string;
  icon: FeaturedRankingTileIcon;
};

export const FEATURED_RANKING_TILES: FeaturedRankingTile[] = [
  {
    id: "top-rated",
    href: "/rankings/overall?sort=rank&dir=asc",
    titleLine1: "Top Rated",
    titleLine2: "Players",
    icon: { type: "star" },
  },
  {
    id: "clinical-finishers",
    href: "/rankings/finishing?sort=rank&dir=asc",
    titleLine1: "Clinical",
    titleLine2: "Finishers",
    icon: { type: "attribute", key: "finishing" },
  },
  {
    id: "speed-demons",
    href: "/rankings/pace?sort=rank&dir=asc",
    titleLine1: "Speed",
    titleLine2: "Demons",
    icon: { type: "attribute", key: "pace" },
  },
  {
    id: "elite-dribblers",
    href: "/rankings/dribbling?sort=rank&dir=asc",
    titleLine1: "Elite",
    titleLine2: "Dribblers",
    icon: { type: "attribute", key: "dribbling" },
  },
  {
    id: "ball-winners",
    href: "/rankings/tackling?sort=rank&dir=asc",
    titleLine1: "Ball",
    titleLine2: "Winners",
    icon: { type: "attribute", key: "tackling" },
  },
  {
    id: "playmakers",
    href: "/rankings/passing?sort=rank&dir=asc",
    titleLine1: "Best",
    titleLine2: "Playmakers",
    icon: { type: "attribute", key: "passing" },
  },
  {
    id: "reflex-kings",
    href: "/rankings/gk_reflexes?sort=rank&dir=asc",
    titleLine1: "Reflex",
    titleLine2: "Kings",
    icon: { type: "attribute", key: "gk_reflexes" },
  },
];
