import Link from "next/link";
import { Image } from "react-bootstrap";

const Socials = () => {
  return (
    <div className="mx-auto">
      <Link
        className="me-2"
        href="https://gnus.ai"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image
          height={30}
          src="images/logo/gnus-icon-white.png"
          alt="GNUS.AI Icon"
        />
      </Link>
      <Link
        className="mx-2"
        href="https://github.com/geniusventures"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image height={30} src="images/socials/github.png" alt="GitHub Icon" />
      </Link>
      <Link
        className="mx-2"
        href="https://x.com/gnusai"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image height={30} src="images/socials/x-logo.png" alt="X Icon" />
      </Link>
      <Link
        className="mx-2"
        href="https://www.youtube.com/@gnusai"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image
          height={30}
          src="images/socials/youtube.png"
          alt="YouTube Icon"
        />
      </Link>
      <Link
        className="mx-2"
        href="https://www.instagram.com/gnus.ai"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image
          height={30}
          src="images/socials/instagram.png"
          alt="Instagram Icon"
        />
      </Link>
      <Link
        className="mx-2"
        href="https://www.linkedin.com/company/gnusai/"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image
          height={30}
          src="images/socials/linkedin.png"
          alt="LinkedIn Icon"
        />
      </Link>
      <Link
        className="mx-2"
        href="https://t.me/geniustokens"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image
          height={30}
          src="images/socials/telegram.png"
          alt="Telegram Icon"
        />
      </Link>
      <Link
        className="ms-2"
        href="https://discord.gg/syqfajh"
        target="_blank"
        rel="noreferrer noopener"
      >
        <Image
          height={30}
          src="images/socials/discord.png"
          alt="Discord Icon"
        />
      </Link>
    </div>
  );
};
export default Socials;
