interface ToggleSwitchProps {
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label }) => {
  return (
    <div className="container">
      {label}
      <div className="toggle-switch">
        <input type="checkbox" className="checkbox" name={label} id={label} />
        <label className="label" htmlFor={label}>
          <span className="inner" />
          <span className="switch" />
        </label>
      </div>
    </div>
  );
};

export default ToggleSwitch;
