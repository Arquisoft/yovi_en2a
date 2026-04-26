import './styles/theme/global.css'
import './styles/theme/variables.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainMenu from './components/mainMenu/MainMenu';
import SelectionWindow from './components/gameSelection/SelectionWindow';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import GameWindow from './components/gameWindow/GameWindow';
import GameWindowOnline from './components/online/GameWindowOnline';
import WaitingRoom from './components/online/WaitingRoom';
import ProtectedRoute from './components/ProtectedRoute';
import { UserProvider } from './contexts/UserContext';
import { AudioProvider } from './contexts/AudioContext';


function App() {
  return (
    <AudioProvider>
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/login" element={<LoginForm/>}/>
          <Route path="/register" element={<RegisterForm/>}/>
          <Route path="/gameSelection" element={<ProtectedRoute><SelectionWindow/></ProtectedRoute>}/>
          <Route path="/waiting/:matchId" element={<ProtectedRoute><WaitingRoom/></ProtectedRoute>}/>
          <Route path="/online/:size/:matchId" element={<ProtectedRoute><GameWindowOnline/></ProtectedRoute>}/>
          <Route path="/play/:size/:mode" element={<ProtectedRoute><GameWindow/></ProtectedRoute>}/>
        </Routes>
      </Router>
    </UserProvider>
    </AudioProvider>
  );
}

export default App;
