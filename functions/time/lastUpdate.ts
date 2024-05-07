const lastUpdate = () => {
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDate = new Date();
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
    timeZone: userTimeZone,
  };
  const formattedDateTime = currentDate.toLocaleString("en-US", options);
  return formattedDateTime;
};
export default lastUpdate;
