import { Link } from 'react-router-dom'; 
import "./TopLeftHeader.css";

const TopLeftHeader = () => {
  return (
    <div className="top-left-header">
      {/* We wrap the h1 in a Link component. 
          The 'to="/"' prop tells React Router to navigate to the root path.*/}
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1 className="game-title">GAME Y</h1>
      </Link>
    </div>
  );
};

export default TopLeftHeader;