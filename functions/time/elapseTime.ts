const elapsedTime = (bts: string) => {
	const timestamp = bts;
	const timestampDate: any = new Date(parseInt(timestamp) / 10000);
	const currentDate: any = new Date();
	const timeDifferenceMs = currentDate - timestampDate;
	const timeDifferenceSec = timeDifferenceMs / 1000;
	const secondsPassed = Math.floor(timeDifferenceSec % 60);
	const minutesPassed = Math.floor(timeDifferenceSec / 60) % 60;
	const hoursPassed = Math.floor(timeDifferenceSec / 3600) % 24;
	const daysPassed = Math.floor(timeDifferenceSec / 86400);

	if (daysPassed == 0 && hoursPassed == 0 && minutesPassed == 0) {
		if (secondsPassed <= 1) {
			return `${secondsPassed} second `;
		} else {
			return `${secondsPassed} seconds `;
		}
	} else if (daysPassed == 0 && hoursPassed == 0) {
		if (minutesPassed <= 1) {
			return `${minutesPassed} minute `;
		} else {
			return `${minutesPassed} minutes `;
		}
	} else if (daysPassed == 0) {
		if (hoursPassed <= 1) {
			return `${hoursPassed} hour `;
		} else {
			return `${hoursPassed} hours `;
		}
	} else {
		if (daysPassed <= 1) {
			return `${daysPassed} day `;
		} else {
			return `${daysPassed} days `;
		}
	}
};

export default elapsedTime;
