// SelectionWindow.tsx
import TopRightMenu from '../topRightMenu/TopRightMenu';
import SelectionPanel from './selectionPanel/SelectionPanel'

const SelectionWindow = () => {
  return (
    <div className="top-right-menu">
      {/* Right most section*/}
      <TopRightMenu/>

      {/* Title */}
      <div className="main-title">
        <h2>SELECT YOUR GAME MODE</h2>
      </div>

      {/* Selection panel */}
      <div className="selection-panel">
        <SelectionPanel/>
      </div>
    </div>
  );
};

export default SelectionWindow;