import { useTranslation } from 'react-i18next';
import players from '../../../../assets/players.png';
import board from '../../../../assets/board.png';
import timer from '../../../../assets/timer.png';

export default function GameRulesHelp() {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{t('help.gameRules.title')}</h2>
      <section>
        <h3>{t('help.gameRules.objective')}</h3>
        <p>{t('help.gameRules.objectiveText')}</p>
        <img src={board} alt="Board in a game" />
      </section>

      <section>
        <h3>{t('help.gameRules.takingTurns')}</h3>
        <p>{t('help.gameRules.takingTurnsText1')}</p>
        <p>{t('help.gameRules.takingTurnsText2')}</p>
        <p></p>
        <p>{t('help.gameRules.takingTurnsText3')}</p>
        <img src={players} alt="Players in a game" />
      </section>

      <section>
        <h3>{t('help.gameRules.winning')}</h3>
        <p>{t('help.gameRules.winningText')}</p>
      </section>

      <section>
        <h3>{t('help.gameRules.timer')}</h3>
        <p>{t('help.gameRules.timerText1')}</p>
        <img src={timer} alt="Timer in a game" />
        <p>{t('help.gameRules.timerText2')}</p>
      </section>
    </div>
  );
}
