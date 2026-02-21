import './styles/theme/global.css'
import './styles/theme/variables.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainMenu from './components/mainMenu/MainMenu';
import SelectionWindow from './components/gameSelection/SelectionWindow';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/gameSelection" element={<SelectionWindow/>}/>
      </Routes>
    </Router>
  );
}

export default App;