import styles from './myScoutingViews.module.css';

export default function MyScoutingErrorView({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <section className={styles.errorPanel} aria-live="polite">
      <h1 className="visuallyHidden">My Scouting</h1>
      <p className={styles.errorMessage}>We couldn&apos;t load your scouting record.</p>
      <button type="button" className={styles.retryButton} onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}
