import { Fragment } from "react";

interface VideoBGProps {
  video: string;
}

const StaticVideoBG: React.FC<VideoBGProps> = ({ video }) => {
  return (
    <Fragment>
      <div
        style={{
          position: "fixed", // Fixed to the viewport
          top: "0",
          left: "0",
          width: "100%",
          height: "100vh", // Full viewport height
          zIndex: "-1", // Stay behind the content
          overflow: "hidden",
          pointerEvents: "none", // Prevent interaction with the video
        }}
        className="bg-black">
        <video
          playsInline
          autoPlay
          muted
          loop
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // Ensure the video covers the viewport
            position: "fixed", // Stick to the viewport
            top: "0",
            left: "0",
          }}>
          <source src={video} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </Fragment>
  );
};

export default StaticVideoBG;
