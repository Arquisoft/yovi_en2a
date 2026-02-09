import './App.css'

import EndGame from './components/EndGame/EndGame';

function App() {
  return (
    <EndGame 
      result={{ outcome: "WIN", winner: "HUMAN", durationMs: 84215, moves: 31, difficulty: "NORMAL"}}/>
  );
}

export default App;
