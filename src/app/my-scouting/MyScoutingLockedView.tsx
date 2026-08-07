import ScoutingLockIcon from '@/components/scouting/ScoutingLockIcon';

import {

  getCappedContributions,

  getProgressRatio,

  getStageTarget,

} from '@/lib/scoutingProgressHelpers';

import { getScoutingProgressTooltip } from '@/lib/scoutingUiCopy';

import type { ScoutingProgress } from '@/lib/scoutingTypes';

import styles from './myScoutingViews.module.css';



export default function MyScoutingLockedView({

  progress,

}: {

  progress: ScoutingProgress;

}) {

  const capped = getCappedContributions(progress);

  const ratio = getProgressRatio(progress);

  const stageTarget = getStageTarget(progress);

  const tooltip = getScoutingProgressTooltip(progress);



  return (

    <section className={styles.lockedRoot} aria-labelledby="my-scouting-locked-title">

      <h1 id="my-scouting-locked-title" className="visuallyHidden">
        My Scouting
      </h1>



      <div className={styles.lockedBody}>

        <div className={styles.lockedIconWrap} aria-hidden="true">

          <ScoutingLockIcon size={28} />

        </div>



        <div

          className={styles.lockedCounter}

          aria-label={`${capped} of ${stageTarget} contributions`}

        >

          {capped} / {stageTarget}

        </div>



        <div

          className={styles.lockedTrack}

          role="progressbar"

          aria-valuemin={0}

          aria-valuemax={stageTarget}

          aria-valuenow={capped}

          aria-label={`Scouting progress: ${capped} of ${stageTarget} contributions`}

        >

          <div className={styles.lockedFill} style={{ width: `${ratio * 100}%` }} />

        </div>



        <p className={styles.lockedHint}>{tooltip}</p>

      </div>

    </section>

  );

}
