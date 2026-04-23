import "./RightPanel.css";
import { useTranslation } from "react-i18next";
import { useUser } from "../../../contexts/UserContext";

type Props = {
  turn: 1 | 2;
  time?: string;
  mode: string | undefined;
};

export default function RightPanel({ turn, time = "00:00", mode }: Readonly<Props>) {
  const { t } = useTranslation();
  const { user } = useUser();
  const isP1 = turn === 1;

  const Player = ({ name, isBlue, isActive, meta }: { name: string; isBlue: boolean; isActive: boolean; meta: string }) => (
    <div className={`rightpanel-player ${isActive ? "active" : ""}`}>
    <div className="rightpanel-left">
      <span className={`dot ${isBlue ? "blue" : "red"}`} />
      <div>
        <div className="rightpanel-name">{name}</div>
        <div className="rightpanel-meta">{meta}</div>
      </div>
    </div>
    <span className="rightpanel-chip">{isActive ? t('rightPanel.yourTurn') : t('rightPanel.waiting')}</span>
  </div>
  );

  return (
    <div className="rightpanel">
      <section className="rightpanel-card">
        <h4 className="rightpanel-title">{t('rightPanel.timer')}</h4>
        <div className="rightpanel-time">{time}</div>
      </section>

      <section className="rightpanel-card">
        <h4 className="rightpanel-title">{t('rightPanel.players')}</h4>
        <Player name={user?.username ?? t('rightPanel.player1')} isBlue isActive={isP1} meta={t('rightPanel.human')} />
        <Player name={t('rightPanel.player2')} isBlue={false} isActive={!isP1} meta={mode === "bot" ? t('rightPanel.bot') : t('rightPanel.human')} />
      </section>
    </div>
  );
}
