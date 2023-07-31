require("dotenv").config();
const axios = require('axios');
const mysql = require('mysql2');
const express = require('express');
const jwt = require("jsonwebtoken");
const {fInsertEvent, fDeleteEvent, fToggleUserAttendance, fGetParticipantsForEvent} = require("../functions/googleCalendar");
const {fGetCurrDateTimeForTimeZone, fGetStatedDateTimeInTimeZone, fGetUniversalDateTimeForStatedDateTime, fGetUniversalDateTimeForCurrDateTime} = require("../functions/time");

var router = express.Router();
const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	database: process.env.DB_NAME,
	password: process.env.DB_PASSWORD,
	multipleStatements: true
});
const promisePool = pool.promise();

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// MIDDLEWARE
router.post("/getEventsForDateAndRoom", verifyAccessToken, deleteOverDueEvents, async (req, res, next) => { // meetings/ events for all time
	console.log("getting events for this date and location ...")
	const {date, meeting_room_id} = req.body; // date => yyyy-mm-dd, meeting_room_id => 1 (just an integer); no need data property, the body already contains the data
	
	// check if date & meeting room are valid
	if (date == undefined || date =="" || meeting_room_id == undefined ) {
		res.status(400).json("Client sent an invalid date or meeting_room_id");
		console.log("request to get events were not made, either meeting room or date is null/ undefined");
		return;
	}

	// query from the DB & send back to client
	try {
		let getEventsForDateAndRoom = `
			SELECT * FROM meetings
			WHERE date="${date}" AND meeting_room_id=${meeting_room_id}
			ORDER BY date, start_time;
		`;
		let dbRes = await promisePool.query(getEventsForDateAndRoom);
		let meetings = dbRes[0]; // array of meetings where meetings are objects
		res.json(meetings); //includes start_time & end_time, date, meting id

		console.log("events for this location, for the entire month, was sent")
	} catch (e) {
		console.log(e); 
		res.status(500).json(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/getMeetingsForStatedUser", verifyAccessToken, deleteOverDueEvents, async (req, res, next) => { // meetings/ events for user for all time; NOT IN USE
	// should be getting from the database, google calendar is secondary
	console.log("Getting meetings for user....")
	const {user_email} = req.body;
	console.log(req.body)
	if (user_email == undefined || user_email == "") {
		res.status(400).json("Client sent an invalid user");
		console.log("request to get events were not made, user was null/ undefined");
		return;
	}
	try {
		// ----------------------------------------------------------------------------------------
		// UPDATE ATTENDACE FOR MEETINGS
		let getMeetingIdsForStateduser = `
			SELECT meeting_id, event_id
			FROM meetings AS M, meeting_participants AS MP
			WHERE attendee_email = "${user_email}" M.meeting_id=MP.meeting_id
		`; // getting the events participants will be a different query
		let dbRes1 = await promisePool.query(getMeetingIdsForStateduser);
		let meetingIds = dbRes1[0]; // array of meetings where meetings are objects
		console.log(meetingIds)

		let count = 0;
		for (let i = 0; i < meetingIds.length; i++) {
			let resStatus = await fUpdateAttendanceStatusesOfMeeting(meetingIds.meeting_id, meetingIds.event_id);
			console.log(resStatus);
			count++
		}
		console.log(count + " meetings were updated")

		// ----------------------------------------------------------------------------------------
		// GET MEETINGS FOR USER
		let getEventsForStatedUser = `
			SELECT M.*, MP.attendee_status, MR.meeting_room_name, MR.gmt
			FROM meetings AS M, meeting_participants AS MP, meeting_rooms AS MR
			WHERE attendee_email = "${user_email}" AND M.meeting_room_id=MR.meeting_room_id AND M.meeting_id=MP.meeting_id
			ORDER BY date, start_time;
		`; // getting the events participants will be a different query
		let dbRes = await promisePool.query(getEventsForStatedUser);
		let meetings = dbRes[0]; // array of meetings where meetings are objects
		console.log(meetings)
		res.json(meetings);
		console.log("Meetings for this user was sent")

	} catch (e) {
		console.log(e); 
		res.status(500).json(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/getCurrAndUpcomingMeetingsForStatedUser", verifyAccessToken, deleteOverDueEvents, async (req, res, next) => { // meetings/ events only from current time (you dont want to render meetings that have already passed)
	console.log("Getting current and upcoming meetings for user....")

	const {user_email} = req.body;
	const currUniversalDateTime = fGetUniversalDateTimeForCurrDateTime();
	console.log(req.body)
	
	if (user_email == undefined || user_email == "") {
		res.status(400).json("Client sent an invalid user");
		console.log("request to get events were not made, user was null/ undefined");
		return;
	}
	
	try {
		// event start date > curr date [UNCONFRIMED & CONFIRMED]
		// event start date = curr date AND start time > curr time [UNCONFRIMED & CONFIRMED]
		// event end date = curr date AND end time >= curr time AND meeting_status = 1 [CONFIRMED]
		// event end date > curr date AND meeting_status = 1 [CONFIRMED]

		// ----------------------------------------------------------------------------------------
		// UPDATE ATTENDACE FOR MEETINGS
		let getMeetingIdsForStateduser = `
			SELECT M.meeting_id, M.event_id
			FROM meetings AS M, meeting_participants AS MP
			WHERE M.meeting_id=MP.meeting_id AND MP.attendee_email = "${user_email}"
			AND (
				(universal_start_date > "${currUniversalDateTime.date}") OR
				(universal_start_date = "${currUniversalDateTime.date}" AND universal_start_time > "${currUniversalDateTime.time}") OR
				(universal_end_date = "${currUniversalDateTime.date}" AND universal_end_time >= "${currUniversalDateTime.time}" AND meeting_status = 1) OR
				(universal_end_date > "${currUniversalDateTime.date}" AND meeting_status = 1)
			)
			ORDER BY date, start_time;
		`; // getting the events participants will be a different query
		let dbRes1 = await promisePool.query(getMeetingIdsForStateduser);
		let meetingIds = dbRes1[0]; // array of meetings where meetings are objects
		console.log(meetingIds)

		let count = 0;
		for (let i = 0; i < meetingIds.length; i++) {
			let meeting = meetingIds[i]
			let resStatus = await fUpdateAttendanceStatusesOfMeeting(meeting.meeting_id, meeting.event_id);
			console.log(resStatus);
			count++
		}
		console.log(count + " meetings were updated")

		// ----------------------------------------------------------------------------------------
		// GET THE MEETINGS
		let getEventsForStatedUser = `
			SELECT M.*, MP.attendee_status, MR.meeting_room_name, MR.gmt
			FROM meetings AS M, meeting_participants AS MP, meeting_rooms AS MR
			WHERE attendee_email = "${user_email}" AND M.meeting_room_id=MR.meeting_room_id AND M.meeting_id=MP.meeting_id 
			AND (
				(universal_start_date > "${currUniversalDateTime.date}") OR
				(universal_start_date = "${currUniversalDateTime.date}" AND universal_start_time > "${currUniversalDateTime.time}") OR
				(universal_end_date = "${currUniversalDateTime.date}" AND universal_end_time >= "${currUniversalDateTime.time}" AND meeting_status = 1) OR
				(universal_end_date > "${currUniversalDateTime.date}" AND meeting_status = 1)
			)
			ORDER BY date, start_time;
		`; // getting the events participants will be a different query
		let dbRes = await promisePool.query(getEventsForStatedUser);
		let meetings = dbRes[0]; // array of meetings where meetings are objects
		console.log(meetings)
		res.json(meetings);
		console.log("Meetings for this user was sent")

	} catch (e) {
		console.log(e); 
		res.status(500).json(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/createEvent", verifyAccessToken, async (req, res, next) => { // GCAL INTEGRATION
	console.log("Creating event ...");
	console.log(eventConfig)
	var eventConfig = req.body; // title, meeting_room_name, description, meeting_room_id, organizer_email, organizer_id, start_date_time, end_date_time, time_zone, attendees(will be an array of objects with email)
	if (!fCheckValidEvent(eventConfig)) {
		res.status(400).json("event created was not valid");
		console.log("event created was not valid")
		return;
	}

	// get & set gmt, room name & time zone
	try {
		let getGmtForMeetingRoom = `
			SELECT time_zone, meeting_room_name, gmt FROM meeting_rooms
			WHERE meeting_room_id = ${eventConfig.meeting_room_id}
		` // meeting room id is being auto-incremented
		var dbRes = await promisePool.query(getGmtForMeetingRoom);
		eventConfig.gmt = dbRes[0][0].gmt;
		eventConfig.meeting_room_name = dbRes[0][0].meeting_room_name;
		eventConfig.time_zone = dbRes[0][0].time_zone;
	} catch (e) {
		res.status(400).json("An error was thrown : " + e);
		console.log("An error was thrown : smt to do with gmt, meeting room name or time zone");
		console.log(e);
		return;
	}
	
	// set google's standard of date & time
	eventConfig.start_date_time = eventConfig.date + 'T' + eventConfig.start_time + ":00" + eventConfig.gmt // '2023-06-08T19:00:00+07:00'
	eventConfig.end_date_time = eventConfig.date + 'T' + eventConfig.end_time + ":00" + eventConfig.gmt // '2023-06-08T19:00:00+07:00'

	// set universal start of date & time (for comparison purposes)
	eventConfig.universalStartDateTime = fGetUniversalDateTimeForStatedDateTime(eventConfig.start_date_time);
	eventConfig.universalEndDateTIme = fGetUniversalDateTimeForStatedDateTime(eventConfig.end_date_time);

	// set google's standard of attendees
	eventConfig.attendees = [];
	eventConfig.meeting_participants.forEach((part) => {
		console.log(part)
		if (part == eventConfig.organizer_email) {
			eventConfig.attendees.push({email: part, responseStatus: "accepted"})
		} else {
			eventConfig.attendees.push({email: part})
		}
	})

	try {
		//insert to google
		var resData = await fInsertEvent({
			summary: eventConfig.title,
			location: eventConfig.meeting_room_name,
			description: eventConfig.description,
			start: {
				dateTime: eventConfig.start_date_time,
				timeZone: eventConfig.time_zone
			},
			end: {
			dateTime: eventConfig.end_date_time, // example : '2023-06-8T19:00:00+07:00' 
			timeZone: eventConfig.time_zone // 'Asia/Jakarta'
			},
			attendees: eventConfig.attendees, // [ {email: 'joe.chua@point-star.com'}, {email: 'joechua247@gmail.com'}, {email: 'joe.chua@demoenterprise.point-star.com', organizer: true} ]
			reminders: {
				useDefault: false,
				overrides: [{ method: 'popup', minutes: 10 }]
			}
		})
		eventConfig.event_id = resData.id
		console.log(`Meeting was created in GCal with event_id ${resData.id}`);

		// add meeting into DB
		let insertMeeting = `
			INSERT INTO meetings (event_id, title, description, meeting_room_id, organizer_email, organizer_id, start_date_time, end_date_time, time_zone, start_time, end_time, date, meeting_status, gmt, universal_start_time, universal_end_time, universal_start_date, universal_end_date)
			VALUES ("${eventConfig.event_id}", "${eventConfig.title}", "${eventConfig.description}", ${eventConfig.meeting_room_id}, "${eventConfig.organizer_email}",
			(SELECT user_id FROM users WHERE user_email="${eventConfig.organizer_email}"), "${eventConfig.start_date_time}", "${eventConfig.end_date_time}", "${eventConfig.time_zone}", "${eventConfig.start_time}", "${eventConfig.end_time}", "${eventConfig.date}", 0, "${eventConfig.gmt}", 
			"${eventConfig.universalStartDateTime.time}", "${eventConfig.universalEndDateTIme.time}", "${eventConfig.universalStartDateTime.date}", "${eventConfig.universalEndDateTIme.date}");
		` // meeting room id is being auto-incremented
		let dbRes = await promisePool.query(insertMeeting);
		eventConfig.meeting_id = dbRes[0].insertId;
		console.log("Meeting was added into DB");
		
		// add attendees into DB
		let insertAttendees = `
			INSERT INTO meeting_participants (attendee_id, meeting_id, attendee_status, attendee_email)
			VALUES 
		`
		for (let i = 0; i < eventConfig.meeting_participants.length; i++) {
			if ( i == eventConfig.meeting_participants.length - 1) {
				insertAttendees = insertAttendees + `((SELECT user_id FROM users WHERE user_email="${eventConfig.meeting_participants[i]}"), ${eventConfig.meeting_id}, 1, "${eventConfig.meeting_participants[i]}");` //the last guy is the organizer
			} else {
				insertAttendees = insertAttendees + `((SELECT user_id FROM users WHERE user_email="${eventConfig.meeting_participants[i]}"), ${eventConfig.meeting_id}, null, "${eventConfig.meeting_participants[i]}"),`
			}
		}
		await promisePool.query(insertAttendees);
		console.log("Meeting participants were added into DB");
		res.json(eventConfig) // need to send back the data for such that it can now display tgt with the meet_id and event_id as well
		
		console.log("Event & meeting were created")
	} catch (e) {
		res.status(400).json("An error was thrown : " + e);
		console.log("An error was thrown : ");
		console.log(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/deleteEvent", verifyAccessToken, async (req, res, next) => { // GCAL INTEGRATION
	console.log("Deleting event...")
	const {meeting_id, event_id} = req.body;
	console.log(meeting_id);
	console.log(event_id);
	try {
		// delete from gcal
		await fDeleteEvent(event_id);
		console.log("Event was deleted from Gcal");
		
		// delete from db
		// delete all participants in meeting participants table 
		let deleteParticipants = `
			DELETE FROM meeting_participants
			WHERE meeting_id = ${meeting_id}
		`
		await promisePool.query(deleteParticipants);

		// THEN delete from meetings table
		let deleteMeeting = `
			DELETE FROM meetings
			WHERE meeting_id = ${meeting_id}
		`
		await promisePool.query(deleteMeeting);
		console.log("Meeting was deleted from DB");
		console.log("Event was successfully deleted");
		res.json("meeting was deleted")
	} catch (e) {
		res.status(400).json("An error was thrown : " + e);
		console.log("An error was thrown : ");
		console.log(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/toggleMeetingConfirmation", verifyAccessToken, async (req, res, next) => {
	console.log("Toggling meeting confirmation...");
	const {meeting_id} = req.body

	// add logic of whether time has pass or not already

	if (meeting_id == undefined) {
		console.log("fields weren't input properly");
		res.status(400).json("fields weren't input properly");
		return;
	}

	try {
		let toggleMeetingConfirmation = `
			set @newMeetingStatus = if ((select meeting_status from meetings where meeting_id = ${meeting_id}) = 0, 1, 0);
			update meetings
			set meeting_status =  @newMeetingStatus
			where meeting_id = ${meeting_id};
			select @newMeetingStatus;
		`;

		let dbRes = await promisePool.query(toggleMeetingConfirmation);
		let meetingStatus = dbRes[0][2][0]["@newMeetingStatus"]; // getting variables value quite different from normal selection from a table
		
		console.log("Meeting confirmation was toggled");
		if (meetingStatus == 1) {
			console.log("Meeting was confirmed");
		} else {
			console.log("Meeting was UNconfirmed");
		}
		res.json(meetingStatus);
	} catch(e) {
		res.status(400).json("An error was thrown : " + e);
		console.log("An error was thrown : ");
		console.log(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/toggleAttendance", verifyAccessToken, async (req, res, next) => { // GCAL INTEGRATION
	console.log("Toggling user attendance for meeting...");
	const {user_email, meeting_id, event_id, action} = req.body; // action is json object => {db: ..., gcal: ...}
	
	if (user_email == '' || meeting_id == undefined) {
		console.log("fields weren't input properly");
		res.status(400).json("fields weren't input properly");
		return;
	}

	try {
		// Do google first
		// 	null - unconfirmed, 1 - confirmed, 0 - declined
		// "needsAction" - unconfirmed, "accepted" - confirmed, "declined" - decline
		await fToggleUserAttendance (event_id, user_email, action.gcal);

		// Do DB next
		let toggleAttendance = `
			set @newAttendeeStatus = ${action.db};
			update meeting_participants
			set attendee_status =  @newAttendeeStatus
			where meeting_id = ${meeting_id} and attendee_email = "${user_email}";
			select @newAttendeeStatus;
		`
		let dbRes = await promisePool.query(toggleAttendance);
		let attendanceStatus = dbRes[0][2][0]["@newAttendeeStatus"]; // getting variables value quite different from normal selection from a table

		console.log("User attendance was toggled");
		if (attendanceStatus == 1) {
			console.log("user is attending");
		} else if (attendanceStatus == 0) {
			console.log("user is NOT attending");
		} else {
			console.log("User is unsure about attending");
		}
		res.json(attendanceStatus)
	} catch(e) {
		res.status(400).json("An error was thrown : " + e);
		console.log("An error was thrown : ");
		console.log(e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/getMeetingParticipants", verifyAccessToken, async (req, res, next) => { // GCAL INTEGRATION
	console.log("Getting meeting details...")
	const { meeting_id, event_id } = req.body;

	if (meeting_id == undefined || event_id == "") {
		res.status(400).json("Client sent an invalid meeting/event");
		console.log("Request to get meeting details failed; meeting id OR event id was invalid");
		return;
	}

	try {
		let resStatus = await fUpdateAttendanceStatusesOfMeeting(meeting_id, event_id);
		console.log("Update of attendances was ", resStatus);

		let getMeetingParticipants = `
			SELECT MP.attendee_status, MP.attendee_email, U.full_name
			FROM meeting_participants AS MP, users AS U
			WHERE meeting_id = "${meeting_id}" AND U.user_id=MP.attendee_id;
		`; // getting the meeting participants
		
		let dbRes = await promisePool.query(getMeetingParticipants);
		let meetingParticipants = dbRes[0]; // array of meeting participants
		console.log(meetingParticipants)
		res.json(meetingParticipants);
		console.log("Meeting participants were sent")

	} catch (e) {
		console.log("Could not retrieve meeting participants, error encountered : ");
		console.log(e);
		res.status(500).json( "Could not retrieve meeting participants, error encountered : " + e);
	}
})

// ------------------------------------------------------------------------------------------------
router.post("/editEvent", verifyAccessToken, async (req, res, next) => { // GCAL INTEGRATION; NOT IN USE
	// only by the organizer
})

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// MMIDDLEWARE FUNCTIONS
// VERIFY ACCESS TOKEN
async function verifyAccessToken (req, res, next) {
	console.log("verifying access token...")
	try {
		jwt.verify(req.cookies.accessToken, process.env.ACCESS_TOKEN_SECRET);
		console.log("access token verified");
		next();
	} catch (e) {
		console.log(e);
		console.log("access token has expired. you need to extend your session");
		console.log("extending session in progress...");
		let {isVerifiedRefreshToken, payload} = await verifyRefreshToken(req, res);
		console.log(isVerifiedRefreshToken)
		if (isVerifiedRefreshToken) {
			// refresh access token
			res = refreshAccessToken(payload, res); // this returns a new res object with access tokens attached to it
			console.log("Access token was refreshed, can all the actual action now");
			next();
		} else {
			res.clearCookie("refreshToken");
			res.clearCookie("accessToken");
			console.log("Access token was NOT able to refresh, error thrown");
			res.status(401).json({error_code: 401, error_message: "refresh token was either invalid or undefined. please login again", isAccessTokenError: true}) // HANDLE REDIRECTION from the front!!!
		}
	}
}

// DELETE OVER DUE EVENTS FROM THE DATABASE (are unconfirmed; still want to keep the confirmed meetings that have passed)
async function deleteOverDueEvents (req, res, next) { // will never delete a confirmed meeting
	// is just using the current time to find all the overdue meetins/events such that we can delete from the DB and not have old meetings rendered out
	console.log("deleting overdue events...");
	
	var count = 0;
	try {
		// get the curr universal date & time
		let currUniversalDateTime = fGetUniversalDateTimeForCurrDateTime();
		console.log(currUniversalDateTime);
		
		// get the invalid ones meetings
		// del where start date < curr date AND meeting_status = 0
		// del where start date = curr date AND start time < curr time AND meeting_status = 0
		let getInvalidIds = `
			SELECT meeting_id, event_id from meetings
			WHERE (universal_start_date<"${currUniversalDateTime.date}" AND meeting_status=0) OR (universal_start_date="${currUniversalDateTime.date}" AND start_time<"${currUniversalDateTime.time}" AND meeting_status=0);
		` // returns an array of meeting_id & event_id that are overdued ; [{meeting_id: ..., event_id: ...}, ...]
		let dbRes = await promisePool.query(getInvalidIds);
		let invalidMeetings = dbRes[0]; // array of meetings where meetings are objects of meeting_id & event_id
		console.log(invalidMeetings)
		count = count + invalidMeetings.length;

		// if there are invalid meetings, delete them
		if (invalidMeetings.length != 0) {
			// invalidMeetings.forEach((meet) => { // cannot use foreach as the async calls are not awaited and will just call the next() function
			for (let j = 0; j < invalidMeetings.length; j++) {
				console.log("Deleting an event...")
				const {meeting_id, event_id} = invalidMeetings[j];
				console.log(meeting_id);
				console.log(event_id);

				// delete from gcal
				await fDeleteEvent(event_id);
				console.log("An Event was deleted from Gcal");
				
				// delete from db
				// delete all participants in meeting participants table 
				let deleteParticipants = `
					DELETE FROM meeting_participants
					WHERE meeting_id = ${meeting_id}
				`
				await promisePool.query(deleteParticipants);

				// THEN delete from meetings table
				let deleteMeeting = `
					DELETE FROM meetings
					WHERE meeting_id = ${meeting_id}
				`
				await promisePool.query(deleteMeeting);
				console.log("Meeting was deleted from DB");
				console.log("Meeting/ Event was successfully deleted");
			}
		}
		console.log(`${count} overdued meetings were deleted, now can retrieve valid meetings`)
		next();
	} catch (e) {
		console.log(e);
		res.status(400).json("something wrong with deleting the invalid meetings")
	}
}

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// OTHER FUNCTIONS
// VERIFY REFRESH TOKEN
async function verifyRefreshToken(req, res) {
	console.log("verifying refresh token for new access tokens...")

	const refreshToken = req.cookies.refreshToken;
	if (refreshToken == undefined) {
		let message = "refresh token is undefined no refresh token, login again";
		console.log(message);
		return {isVerifiedRefreshToken: false, payload: undefined, message: message};
	}

	const payload = jwt.decode(refreshToken);
	if (payload == undefined) {
		let message = "jwt cant be decoded: invalid user, need to re-login";
		console.log(message);
		return {isVerifiedRefreshToken: false, payload: undefined, message: message};
	}
	delete payload.exp

	try {
		let dbRes = await promisePool.query(`SELECT * FROM users;`);
		let users = dbRes[0]; // the 0 index has the array of data

		for (let i = 0; i < users.length; i++) {
			if (users[i].user_email == payload.email) {
				var user = users[i];
				console.log(user)
				
				// user logged out
				if (user.login_status == 0) {
					let message = "user was logged out, need to re-login again";
					console.log(message);
					return {isVerifiedRefreshToken: false, payload: undefined, message: message};
				}

				// decode the refreshtoken, checks if its legit & expired
				var tokenSecret = user.email + user.join_date_time + process.env.REFRESH_TOKEN_SECRET;
				console.log(tokenSecret)
				jwt.verify(refreshToken, tokenSecret);
				let message = "jwt verified; return true to get another access token";				
				console.log(message);
				return {isVerifiedRefreshToken: true, payload: payload, message: message};
			}
		}

		let message = "user not found in the database, please log in with valid google account"
		console.log(message);
		return {isVerifiedRefreshToken: false, payload: undefined, message: message};
	} catch (e) {
		let message = "refresh token FAILED to verify"
		console.log(message);
		return {isVerifiedRefreshToken: false, payload: undefined, message: message};
	}
}

// REFRESH ACCESS TOKEN
async function refreshAccessToken (payload, res) {
	console.log("refreshing access token...");
	const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn:  1000 * 60 * 30 });
	res.clearCookie("accessToken");
	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		maxAge: 1000 * 60 * 31,
		signed: false
	});
	console.log("access token is refreshed");
	return res;
}

// CHECK IF EVENT SENT FROM THE CLIENT IS VALID
function fCheckValidEvent (eventConfig) {
	console.log("checking if event is valid...");
	if (eventConfig == undefined) {
		return false;
	}

	for (var p in eventConfig) {
		let pVal = eventConfig[`${p}`]
		console.log(p)
		console.log(pVal)

		if (p == "title" || p == "description") {
			console.log("title or description was reached just continue");
			continue;
		}

		if (p == "meeting_room_id") {
			if (pVal == undefined) {
				console.log("meeting room was not defined");
				return false;
			} else {
				continue;
			}
		}

		if (p == "meeting_participants") {
			if (pVal.length == 0 || (pVal.length == 1 && (pVal[0] == '' || pVal[0] == null))) {
				console.log("event has no participants, but event must have at least 1 participant")
				return false;
			}
		}

		if (pVal == '' || pVal == undefined) {
			console.log("this property's value cannot be empty");
			return false;
		}
	}
	
	console.log("event is valid");
	return true;
}

async function fGetAttendeeStatusForMeetingInDb (meeting_id, attendee_email) {
	if (meeting_id == undefined || attendee_email == '') {
		throw new Error('there was an error getting attendee status: no such meeting or attendee');
	}

	let getMeetingParticipant = `
		SELECT attendee_status FROM meeting_participants
		WHERE attendee_email = "${attendee_email}" AND meeting_id = ${meeting_id};
	` // dbRes[0] returns [ {attendee_status: 1} ]

	try {
		let dbRes = await promisePool.query(getMeetingParticipant);
		if (dbRes.length == 0) {
			throw new Error('there was an error getting attendee status: no such meeting or attendee');
		}
		let resultData = dbRes[0]; // array of meetings where meetings are objects of meeting_id & event_id
		return resultData[0].attendeeStatus
	} catch (e) {
		console.log("there was an error getting attendee status");
		throw e;
	} 
}

// NEED TO UPDATE PARTICIPANTS STATUSES OF MEETINGS TO TALLY WITH GCAL B4 DISPLAYING
async function fUpdateAttendanceStatusesOfMeeting (meeting_id, event_id) {
	console.log("Updating meeting attendance base on GCal...");
	
	// reject invalid meetings/ events
	if (meeting_id == undefined || event_id == "") {
		console.log("Request to get meeting details failed; meeting id OR event id was invalid");
		throw new Error("Request to get meeting details failed; meeting id OR event id was invalid");
	}


	try {
		// go gcal, retrieve all the participants for the event
		var participantsArr = await fGetParticipantsForEvent(event_id);
		
		// compare the response status in gcal vs the participants status in the DB => if DB is different, update it
		for (let i = 0; i < participantsArr.length; i++) {
			let participant = participantsArr[i] // email & responseStatus
			let currAttendeeStatus = participant.responseStatus == "accepted" ? 1 : participant.responseStatus == "declined" ? 0 : null;
			let attendeeStatusInDb = fGetAttendeeStatusForMeetingInDb(meeting_id, participant.email);
			if (attendeeStatusInDb != currAttendeeStatus) {
				// update the database status
				let updateDbAttendeeStatus = `
					UPDATE meeting_participants
					SET attendee_status = ${currAttendeeStatus}
					WHERE attendee_email = "${participant.email}" AND meeting_id = ${meeting_id};
				`
				await promisePool.query(updateDbAttendeeStatus);
			}
		}

		console.log("Meeting attendance was updated base on GCal");
		return true;
	} catch (e) {
		console.log("there was an issue updating the attendance atatuses of the selected meeting");
		throw e;
	}
}

module.exports = router;

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// DRAFT : 
// In this draft, we managed to toggle the attendance such that the user is able to indicate their attendance for the meeting on both 
// google calendar & on our front end client.

// LOGIC :
// when someone clicks the attendance button on our app, they will update both DB & GCal
// when someone clicks the attendance button on GCal, they will update GCal only => need to have a trigger point to update DB as well
// for DB to update, 2 occasions will update the DB :
	// when user clicks to see their own meetings, they want to see their updated attendance => update from GCal; since the most updated attendance will always be from GCal
	// when user clicks to see meeting details, they want to see everyone's updated attendance => update from GCal; since the most updated attendance will always be from GCal


// OTHER DETAILS :
// joe.chua@point-star.com, joechua247@gmail.com, joe.chua@demoenterprise.point-star.com
// joe.chua@point-star.com, joe.chua@demoenterprise.point-star.com, wuihong.khoo@point-star.com

// meetings returned to the front are in this format
// {
//     title: 'test 6 ',
//     description: 'this is a test',
//     organizer_id: 1,
//     organizer_email: 'joe.chua@point-star.com',
//     date: '2023-06-09',
//     start_time: '14:00',
//     end_time: '15:00',
//     time_zone: 'Asia/Jakarta',
//     meeting_status: 0
//     meeting_id: 6,
//     event_id: '6fqjd45s5ekmqrd77go4buglp8',
//     meeting_room_id: 0,
//     start_date_time: '2023-06-09T14:00:00+07:00',
//     end_date_time: '2023-06-09T15:00:00+07:00',
//     meeting_room_name: '...',
//     attendee_status: 0 or 1,
// }