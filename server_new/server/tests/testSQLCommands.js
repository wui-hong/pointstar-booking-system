require("dotenv").config({path: "../.env"}); //for some reason this needs to point to the right directory but dky the react app one doesnt need to point to it LOL
const mysql = require('mysql2');

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
// VIEW USERS
var viewUsers = `
	SELECT * FROM nothing;
` // returns the values of the col in order that you defined in the command AND the data is in an array where each row is an object [ {email: 'joe.chua@point-star.com', user_id: 1, full_name: 'chua yong yuan, joe'} ]

// ------------------------------------------------------------------------------------------------
// GET SPECIFIC USER
var getSpecificUser = `
	select * from users
	where id = 1;
`

// ------------------------------------------------------------------------------------------------
// CREATE USER
// google provides : 
// name, picture, email, clientId
var user = {
	user_id: 1,
	email: "joe.chua@point-star.com",
	full_name: "chua yong yuan, joe",
	image_url: "https://lh3.googleusercontent.com/a/AAcHTtfLDut0op2OPsBimveqwjDfadjFcqe-q2JzNOeY=s96-c",
	join_date_time: "Sun Jun 11 2023 21:19:14 GMT+0700 (Western Indonesia Time)",
	last_login: "Sun Jun 11 2023 21:19:14 GMT+0700 (Western Indonesia Time)",
	login_status: 1
};

// var createUser = `INSERT INTO pointstarBookingSystem.users (user_id, email, full_name, image_url, join_date_time, last_login, login_status) 
// VALUES (5, "lol2joe.chua@point-star.com", "chua yong yuan, joe", "https://lh3.googleusercontent.com/a/AAcHTtfLDut0op2OPsBimveqwjDfadjFcqe-q2JzNOeY=s96-c", "Sun Jun 11 2023 21:19:14 GMT+0700 (Western Indonesia Time)", "as", 1);`
var createUser = `
	INSERT INTO pointstarBookingSystem.users
	VALUES (${user.user_id}, "${user.email}", "${user.full_name}", "${user.image_url}", "${user.join_date_time}", "${user.last_login}", "${user.login_status}");
`

// ------------------------------------------------------------------------------------------------
// DELETE USERS
var deleteUsers = `
	DELETE FROM users
` // this means delete all from users, if you only want to delete a specifc user, use WHERE user_id=5

// ------------------------------------------------------------------------------------------------
// VIEW ALL MEETINGS

// ------------------------------------------------------------------------------------------------
// VIEW SPECIFIED USER MEETINGS
var specifiedUserMeetings = `
`

// ------------------------------------------------------------------------------------------------
// INSERT MEETING
var meeting_details = {
	event_id: "random string",
	title: "test",
	description: "this is a test",
	meeting_room_id: 0,
	organizer_id: "",
	start_date_time: "2023-06-08T17:00:00+07:00",
	end_date_time: "2023-06-08T19:00:00+07:00",
	time_zone: "Asia/Jakarta",
	organizer_email: "wuihong.khoo@point-star.com",
	date: "2023-06-08",
	start_time: "19:00",
	end_time: "21:00"
}
// the meeting id can be 0 since it will auto increment ALSO organizer id can be selected from their email
var insertMeeting = `insert into meetings
value (0,
"${meeting_details.event_id}", 
"${meeting_details.title}",
"${meeting_details.description}", 
${meeting_details.meeting_room_id},
(SELECT id FROM users WHERE email="wuihong.khoo@point-star.com"),
"${meeting_details.start_date_time}",
"${meeting_details.end_date_time}", 
"${meeting_details.time_zone}",
"${meeting_details.organizer_email}",
"${meeting_details.date}",
"${meeting_details.start_time}",
"${meeting_details.end_time}");
`

var insertMeetingParticipants = (meeting_id, meeting_attendees) => {
	var command = `
		insert into meeting_participants
		value `;
	for (let i = 0; i < meeting_attendees.length; i++) {
		command = command + `((SELECT id FROM users WHERE email="${meeting_attendees[i].email}"), ${meeting_id}, 0, "${meeting_attendees[i].email}")` // id will just be nullif not set
		command = i == meeting_attendees.length - 1 ? command + ";" : command + ", ";
	}
	return command;
}

// ------------------------------------------------------------------------------------------------
// DELETE MEETING
// when to delete meeting : 
// when user manually deletes meeting
// when user that created the meeting OR any attendee that is suppose to attend the meeting, request from the db to view, its not confirmed yet time already pass => delete & dont send them that meeting alr
// whenever someone logs on to check for the availability, the meeting that is over due needs to be deleted

// ------------------------------------------------------------------------------------------------
// UPDATE MEETING STATUS
// let toggleEventConfirmation = `
// 	set @newMeetingStatus = if ((select meeting_status from meetings where meeting_id = 1) = 0, 1, 0);
// 	update meetings
// 	set meeting_status =  @newMeetingStatus
// 	where meeting_id = 1;
// 	select @newMeetingStatus;
// `;

// ------------------------------------------------------------------------------------------------
// GET MEETING PARTICIPANT BASE ON EMAIL
let getMeetingParticipant = `
	SELECT attendee_status FROM meeting_participants
	WHERE attendee_email = "joe.chua@point-star.com" AND meeting_id = 11;
` // dbRes[0] returns [ {attendee_status: 1} ]

// ------------------------------------------------------------------------------------------------
let updateDbAttendeeStatus = `
	UPDATE meeting_participants
	SET attendee_status = null
	WHERE attendee_email = "joe.chua@point-star.com" AND meeting_id = 11;
`

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// EXECUTE
// generic test
async function test () {
	try {
		let dbRes = await promisePool.query(updateDbAttendeeStatus);
		let resultData = dbRes[0]; // array of meetings where meetings are objects of meeting_id & event_id
		console.log(resultData)
	} catch (e) {
		console.log(e);
	} 
}
test();

// ------------------------------------------------------------------------------------------------
// insert meeting test
// async function test () {
// 	var attendees = [
// 		{email: 'joe.chua@point-star.com'},
// 		{email: 'joechua247@gmail.com'},
// 		{email: 'joe.chua@demoenterprise.point-star.com'}]
// 	try {
// 		var res = await promisePool.query(insertMeeting); // should throw error
// 		var meeting_id = res[0].insertId
// 		await promisePool.query(insertMeetingParticipants(meeting_id, attendees));
// 	} catch (e) {
// 		console.log(e);
// 	} 
// }
