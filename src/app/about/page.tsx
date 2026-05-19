import Image from 'next/image';
import styles from './about.module.css';

const sections = [
  {
    icon: 'text',
    textIcon: 'Z',
    title: 'What is Zcout?',
    paragraphs: [
      'Zcout aims to build a living, crowd-powered football attributes database.',
      'The core of the project is a fast duel system designed to give football fans a lightweight and intuitive way to express their opinions through simple player comparisons.',
      'Alongside duels, Zcout also includes scouting reports - a deeper contribution layer focused on more detailed player evaluation.',
      'While the interface is intentionally simple and frictionless, the underlying system combines multiple data sources, rating logic and integrity mechanisms to gradually build evolving player profiles.',
      'The current alpha focuses on Premier League players.',
    ],
  },
  {
    icon: 'text',
    textIcon: '⚔',
    title: 'Duel System',
    paragraphs: [
      'Duels are the core data source behind Zcout.',
      'Instead of forcing users to manually assign numerical ratings, Zcout focuses on direct comparisons between two players in a single attribute. In many cases, people are naturally better at choosing “who is better” than assigning precise values on a scale.',
      'The system is also designed around speed, engagement and repeatability. A single duel takes only a few seconds and immediately reveals the crowd verdict - showing how the community voted in that matchup and how much the user’s decision influenced both player ratings.',
      'Each vote is processed by a custom Elo-like rating system that continuously updates player attributes over time.',
    ],
  },
  {
    icon: '/icons/matchmaking.svg',
    title: 'Matchmaking System',
    paragraphs: [
      'Zcout does not generate random duels.',
      'The matchmaking system is designed to create more meaningful and engaging comparisons by taking into account factors such as player level, attribute confidence, freshness, positional context and comparison attractiveness.',
      'The goal is to surface matchups that are both interesting for users and valuable for the rating system itself.',
      'As player profiles evolve, the system continuously adapts which duels should appear more or less frequently.',
    ],
  },
  {
    icon: '/icons/confidence.svg',
    title: 'Confidence System',
    paragraphs: [
      'Every overall rating and individual attribute in Zcout includes a confidence level alongside the rating itself.',
      'Confidence represents how much trust the system currently has in a given rating based on factors such as vote volume, consistency and data quality.',
      'Different user reputation levels can influence not only rating changes, but also the confidence value carried by their votes.',
      'Attributes and profiles with lower confidence are more likely to appear in future duels, allowing the system to gradually improve uncertain areas and stabilize player profiles over time.',
    ],
  },
  {
    icon: '/icons/trust.svg',
    title: 'Trust, Integrity & Reputation',
    paragraphs: [
      'Zcout includes trust, integrity and reputation mechanisms designed to reduce manipulation, low-quality voting and other unreliable behaviour.',
      'Over time, the system evaluates voting patterns and consistency to better estimate how trustworthy a user’s contributions are.',
      'User reputation can influence both rating impact and confidence contribution, allowing reliable users to have greater influence on the evolution of player profiles.',
      'The goal is not to punish disagreement, but to improve long-term data quality while keeping contribution fast and accessible.',
    ],
  },
  {
    icon: 'text',
    textIcon: '✎',
    title: 'Scout Reports',
    paragraphs: [
      'Scout Reports are a deeper contribution layer designed for users who want to go beyond quick duels and provide more detailed player evaluation.',
      'Unlike the fast comparison-based core loop, Scout Reports allow users to assess multiple attributes, describe player strengths and weaknesses, and contribute broader scouting insight.',
      'The goal is not to replace duels, but to complement them with richer long-form input from more engaged contributors.',
      'Scout Reports currently require an account and represent a more reputation-driven part of the system.',
    ],
  },
];

function AboutSection(props: {
  icon: string;
  textIcon?: string;
  title: string;
  paragraphs: string[];
}) {
  const isImageIcon = props.icon.endsWith('.svg');

  return (
    <section className={styles.section}>
      <div className={styles.iconColumn}>
        <div className={styles.iconCircle}>
          {isImageIcon ? (
            <img
                src={props.icon}
                alt=""
                className={styles.svgIcon}
                />
          ) : (
            props.textIcon
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div>
          <h2 className={styles.title}>{props.title}</h2>

          <div className={styles.divider} />
        </div>

        <div className={styles.paragraphs}>
          {props.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className={styles.page}>
      {sections.map((section) => (
        <AboutSection
          key={section.title}
          icon={section.icon}
          textIcon={section.textIcon}
          title={section.title}
          paragraphs={section.paragraphs}
        />
      ))}
    </main>
  );
}