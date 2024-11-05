import { toast } from "react-toastify";

interface ToggleSwitchProps {
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label }) => {
  const handleToggleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.preventDefault(); // Prevents the checkbox from toggling
    toast(`Mainnet coming soon...stay tuned!`, {
      style: {
        backgroundColor: "#00000050",
        backdropFilter: "blur(10px)",
        color: "#ffffff",
        fontSize: "1rem",
        border: "1px solid #36edb5",
      },
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: false,
    });
  };
  return (
    <div className="container">
      {label}
      <div className="toggle-switch">
        <input
          type="checkbox"
          className="checkbox"
          name={label}
          id={label}
          onClick={handleToggleClick}
        />
        <label className="label" htmlFor={label}>
          <span className="inner" />
          <span className="switch" />
        </label>
      </div>
    </div>
  );
};

export default ToggleSwitch;
