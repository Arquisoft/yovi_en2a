import './App.css'
import MainMenu from './MainMenu';
import MenuButtons from './MenuButtons';
import configIcon from './assets/configuracion.svg';

function App() {
  return (
    <div className="App">
      <div className="top-right-menu">
        <MenuButtons
          label="Configuración"
          onClick={() => console.log('Configuración')}
          img= {configIcon}
        />
      </div>

      <h2>GameY</h2>
      <MainMenu />
    </div>
  );
}


export default App;
