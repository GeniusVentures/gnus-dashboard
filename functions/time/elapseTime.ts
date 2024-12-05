const elapsedTime = (bts: any) => {
  // Parse the input timestamp
  const timestampDate: any = new Date(bts); // Assume ISO 8601 format
  if (isNaN(timestampDate.getTime())) {
    throw new Error("Invalid timestamp format");
  }

  const currentDate: any = new Date();
  const timeDifferenceMs = currentDate - timestampDate; // Difference in milliseconds
  const timeDifferenceSec = timeDifferenceMs / 1000;

  const secondsPassed = Math.floor(timeDifferenceSec % 60);
  const minutesPassed = Math.floor((timeDifferenceSec / 60) % 60);
  const hoursPassed = Math.floor((timeDifferenceSec / 3600) % 24);
  const daysPassed = Math.floor(timeDifferenceSec / 86400);

  console.log({ secondsPassed, minutesPassed, hoursPassed, daysPassed });

  if (daysPassed === 0 && hoursPassed === 0 && minutesPassed === 0) {
    return secondsPassed === 1
      ? `${secondsPassed} second`
      : `${secondsPassed} seconds`;
  } else if (daysPassed === 0 && hoursPassed === 0) {
    return minutesPassed === 1
      ? `${minutesPassed} minute`
      : `${minutesPassed} minutes`;
  } else if (daysPassed === 0) {
    return hoursPassed === 1 ? `${hoursPassed} hour` : `${hoursPassed} hours`;
  } else {
    return daysPassed === 1 ? `${daysPassed} day` : `${daysPassed} days`;
  }
};

export default elapsedTime;
