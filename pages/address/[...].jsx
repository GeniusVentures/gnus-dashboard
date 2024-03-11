const { Fragment } = require("react");

const Blocks = () => {
  return (
    <Fragment>
      <div className="video-background">
        <video autoPlay loop muted>
          <source src="/videos/gnus-ai-background.mp4" type="video/mp4" />
        </video>
      </div>
    </Fragment>
  );
};
export default Blocks;
