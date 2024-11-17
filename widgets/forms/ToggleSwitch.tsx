import { Image } from "react-bootstrap";
import { toast } from "react-toastify";

interface ToggleSwitchProps {
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ label }) => {
  const handleToggleClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.preventDefault(); // Prevents the checkbox from toggling
    toast(`Mainnet coming soon...stay tuned!`, {
      className: "gnus-toast",
      icon: <Image height={30} src="images/logo/gnus-icon.png" />,
    });
  };
  return (
    <div className="container">
      <div className="toggle-switch mt-2">
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
