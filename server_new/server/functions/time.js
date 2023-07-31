function fGetCurrDateTimeForTimeZone (time_zone) { // returns the time in both +07:00 & +08:00 gmt
	const d = new Date();
	const dateTimeStr = d.toLocaleString("en-US", {timeZone: time_zone, hour12: false, hourCycle: "h23", year: "numeric",month: "2-digit",day: "2-digit",hour: "2-digit",minute: "2-digit"});
	let dateTimeArr = dateTimeStr.split(", "); // returns [ '06/20/2023', '09:18' ]

	// the hour cycle config doesnt work, still need to change the 24 o clock ourselves => but at least returns this format now 06/20/2023, 24:39
	// mm/dd/yyyy, hh:mm => need to change to yyyy-mm-dd 
	const dateArr = dateTimeArr[0].split("/")
	const dateStr = dateArr[2] + "-" + dateArr[0] + "-" + dateArr[1]
	console.log(dateStr)

	// for time, if hour == 24, change to 00
	let timeStr = dateTimeArr[1]
	if (timeStr.slice(0,2) == "24") { // when u slice, the index u indicated for the end is not include, so only the characters 0 and 1 indexed is included here
		timeStr = "00:" + timeStr.slice(3,5);
	}
	console.log(timeStr)

	return {date: dateStr, time: timeStr};
}

function fGetStatedDateTimeInTimeZone (initialDateStr, time_zone) {
	const d = new Date(initialDateStr);
	let dateTimeStr = d.toLocaleString("en-US", {timeZone: time_zone, hour12: false, hourCycle: "h23", year: "numeric",month: "2-digit",day: "2-digit",hour: "2-digit",minute: "2-digit"});
	console.log(dateTimeStr);

	// the hour cycle config doesnt work, still need to change the 24 o clock ourselves => but at least returns this format now 06/20/2023, 24:39
	// mm/dd/yyyy, hh:mm => need to change to yyyy-mm-dd 
	let dateTimeArr = dateTimeStr.split(", "); // returns [ '06/20/2023', '09:18' ]
	let dateArr = dateTimeArr[0].split("/")
	const dateStr = dateArr[2] + "-" + dateArr[0] + "-" + dateArr[1]
	console.log(dateStr)

	// for time, if hour == 24, change to 00
	let timeStr = dateTimeArr[1]
	if (timeStr.slice(0,2) == "24") {
		timeStr = "00:" + timeStr.slice(3,5);
	}
	console.log(timeStr)

	return {date: dateStr, time: timeStr};
}

function fGetUniversalDateTimeForStatedDateTime (initialDateStr) {
	console.log("Getting universal date & time for stated date & time...")
	const d = new Date(initialDateStr);
	let dateTimeStr = d.toLocaleString("en-US", {timeZone: "Africa/Abidjan", hour12: false, hourCycle: "h23", year: "numeric",month: "2-digit",day: "2-digit",hour: "2-digit",minute: "2-digit"});
	console.log(dateTimeStr);

	// the hour cycle config doesnt work, still need to change the 24 o clock ourselves => but at least returns this format now 06/20/2023, 24:39
	// mm/dd/yyyy, hh:mm => need to change to yyyy-mm-dd 
	let dateTimeArr = dateTimeStr.split(", "); // returns [ '06/20/2023', '09:18' ]
	console.log(dateTimeArr)
	let dateArr = dateTimeArr[0].split("/")
	const dateStr = dateArr[2] + "-" + dateArr[0] + "-" + dateArr[1]
	console.log(dateStr)

	// for time, if hour == 24, change to 00
	let timeStr = dateTimeArr[1]
	if (timeStr.slice(0,2) == "24") {
		timeStr = "00:" + timeStr.slice(3,5);
	}
	console.log(timeStr)

	return {date: dateStr, time: timeStr};
}

function fGetUniversalDateTimeForCurrDateTime () {
	const d = new Date();
	let dateTimeStr = d.toLocaleString("en-US", {timeZone: "Africa/Abidjan", hour12: false, hourCycle: "h23", year: "numeric",month: "2-digit",day: "2-digit",hour: "2-digit",minute: "2-digit"});
	console.log(dateTimeStr);

	// the hour cycle config doesnt work, still need to change the 24 o clock ourselves => but at least returns this format now 06/20/2023, 24:39
	// mm/dd/yyyy, hh:mm => need to change to yyyy-mm-dd 
	let dateTimeArr = dateTimeStr.split(", "); // returns [ '06/20/2023', '09:18' ]
	let dateArr = dateTimeArr[0].split("/")
	const dateStr = dateArr[2] + "-" + dateArr[0] + "-" + dateArr[1]
	console.log(dateStr)

	// for time, if hour == 24, change to 00
	let timeStr = dateTimeArr[1]
	console.log(timeStr)
	if (timeStr.slice(0,2) == "24") {
		timeStr = "00:" + timeStr.slice(3,5);
	}
	console.log(timeStr)

	return {date: dateStr, time: timeStr};
}

module.exports.fGetCurrDateTimeForTimeZone = fGetCurrDateTimeForTimeZone;
module.exports.fGetStatedDateTimeInTimeZone = fGetStatedDateTimeInTimeZone;
module.exports.fGetUniversalDateTimeForStatedDateTime = fGetUniversalDateTimeForStatedDateTime;
module.exports.fGetUniversalDateTimeForCurrDateTime = fGetUniversalDateTimeForCurrDateTime;

// ------------------------------------------------------------------------------------------------

// export default fGetCurrDateTimeForTimeZone; // invalid statement if im using require
// console.log(fGetCurrDateTimeForTimeZone("Asia/Jakarta"));
// console.log(fGetCurrDateTimeForTimeZone("Asia/Singapore"));
// console.log(fGetCurrDateTimeForTimeZone("Asia/Kuala_Lumpur"));

