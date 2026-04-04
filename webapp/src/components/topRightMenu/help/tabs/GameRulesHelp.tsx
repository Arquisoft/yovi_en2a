import players from '../../../../assets/players.png';
import board from '../../../../assets/board.png';
import timer from '../../../../assets/timer.png';

export default function GameRulesHelp() {
  return (
    <div>
      <h2>Game Rules</h2>
      <section>
        <h3>Objective</h3>
        <p>
          Connect all three sides of the board with a consecutive chain
          before your opponent does.
        </p>
        <img src={board} alt="Board in a game" />

      </section>

      <section>
        <h3>Taking turns</h3>
        <p> Players alternate placing one piece per turn on any empty cell of the board. </p>
        <p> Once placed, pieces cannot be moved or removed.</p>

        <p></p>
        <p>The player turn is indicated on the screen.</p>
        <img src={players} alt="Players in a game" />
      </section>

      <section>
        <h3>Winning</h3>
        <p>
          The first player to connect all three side wins. The game ends immediately
          when a winner is detected.
        </p>
      </section>

      <section>
        <h3>Timer</h3>
        <p> Each match has a timer running from the start.</p>
        <img src={timer} alt="Timer in a game" />
        <p>Your total time is recorded at the end of the game and used in the rankings if you are logged in.</p>
      </section>
    </div>
  );
}