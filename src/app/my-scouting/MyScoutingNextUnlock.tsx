import Tooltip from '@/components/Tooltip';

import ScoutingLockIcon from '@/components/scouting/ScoutingLockIcon';

import {

  getCappedContributions,

  getProgressRatio,

  getStageTarget,

} from '@/lib/scoutingProgressHelpers';

import { getScoutingProgressTooltip } from '@/lib/scoutingUiCopy';

import type { ScoutingProgress } from '@/lib/scoutingTypes';

import WidgetPanel from '@/components/ui/WidgetPanel';

import styles from './myScoutingDashboard.module.css';



export default function MyScoutingNextUnlock({

  progress,

}: {

  progress: ScoutingProgress;

}) {

  const capped = getCappedContributions(progress);

  const ratio = getProgressRatio(progress);

  const stageTarget = getStageTarget(progress);

  const tooltip = getScoutingProgressTooltip(progress);



  const panel = (

    <WidgetPanel variant="card" borderTitle={false} className={styles.nextUnlockPanel}>

      <div className={styles.nextUnlockBody}>

        <div className={styles.nextUnlockLabel}>NEXT UNLOCK</div>

        <div className={styles.nextUnlockTitle}>Your Impact</div>

        <div className={styles.nextUnlockIcon} aria-hidden="true">

          <ScoutingLockIcon size={24} />

        </div>

        <div

          className={styles.nextUnlockCounter}

          aria-label={`${capped} of ${stageTarget} contributions`}

        >

          {capped} / {stageTarget}

        </div>

        <div

          className={styles.nextUnlockTrack}

          role="progressbar"

          aria-valuemin={0}

          aria-valuemax={stageTarget}

          aria-valuenow={capped}

          aria-label={`Scouting progress: ${capped} of ${stageTarget} contributions`}

        >

          <div className={styles.nextUnlockFill} style={{ width: `${ratio * 100}%` }} />

        </div>

      </div>

    </WidgetPanel>

  );



  return <Tooltip content={tooltip}>{panel}</Tooltip>;

}
