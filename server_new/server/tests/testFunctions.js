function getCurrDateTimeForTimeZone (time_zone) { // returns the time in both +07:00 & +08:00 gmt
	// let d = new Date();
	// let dateTime = d.toLocaleString("en-US", {timeZone: time_zone, hour12: false}); // the return result looks like this => 6/19/2023, 23:52:30
	const d = new Date();
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
	console.log(timeStr)
	console.log(timeStr.slice(0,2))
	console.log(timeStr.slice(3,5))
	// timeStr = "24:00"; // test if it works
	if (timeStr.slice(0,2) == "24") {
		timeStr = "00:" + timeStr.slice(3,5);
	}
	console.log(timeStr)

	// return {date: dateStr, time:...};
}

// getCurrDateTimeForTimeZone("Asia/jakarta");

// ------------------------------------------------------------------------------------------------
function getStatedDateTimeInTimeZone (dateObject, time_zone) {
	const d = dateObject;
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

let d = new Date("2023-06-08T06:59:00+07:00");
let dateTime = getStatedDateTimeInTimeZone(d, "Africa/Abidjan");
console.log(dateTime)

// every time i create a new event, i create this neutral timing that is standerdised across all meetings
// 
