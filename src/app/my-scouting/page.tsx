import MyScoutingPageView from './MyScoutingPageView';
import styles from './page.module.css';

export default function MyScoutingPage() {
  return (
    <main className={styles.pageShell}>
      <div className={styles.pageInner}>
        <MyScoutingPageView />
      </div>
    </main>
  );
}
