const {JWT} = require('google-auth-library');
const {google} = require('googleapis');
const keys = require('../credentials/keys.json');

var calendar = google.calendar('v3');
const SCOPES = [
    'https://www.googleapis.com/auth/calendar'
];
const client = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: SCOPES,
});

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// EVENT FUNCTIONS
//insert event
var fInsertEvent = async (eventData) => {
    try {
        var res = await calendar.events.insert({ // dky the syntax say no need await but it does hold the function till the event is added
            auth: client,
            calendarId: 'primary', // if its primary means its using service's account primary calendar
            resource: eventData
        });
        return res.data;
    } catch (e) {
        console.log(e);
        throw e;
    }
}

// ------------------------------------------------------------------------------------------------
var fDeleteEvent = async (eventId) => {
    try {
        var res = await calendar.events.delete({
            auth: client,
            calendarId: 'primary',
            eventId: eventId,
        });
        console.log("event was deleted");
        return res.data;
    } catch (e) {
        console.log(e);
        throw e;
    }
}

var fToggleUserAttendance = async (eventId, user_email, action) => {
    console.log("Toggling user attendance...");

    try {
        console.log("Getting event ...");
        let response = await calendar.events.get({ calendarId: 'primary', eventId: eventId, auth: client});
        if (response) {
            console.log("Retrieved event ...");
        }

        // Update the attendee's status
        const attendeeToUpdate = response.data.attendees.find((attendee) => attendee.email === user_email);
        if (attendeeToUpdate) {
            attendeeToUpdate.responseStatus = action; // Set to the desired status: "needsAction" - unconfirmed, "accepted" - confirmed, "declined" - decline
            console.log("attendee status was set to accepted");
        }
        
        console.log("Updating attendance status...")
        // Update the event
        var res = await calendar.events.update({ calendarId: 'primary', eventId: eventId, resource: response.data, auth: client});
        if (res) {
            console.log('Attendee status updated successfully: ');
        }
        console.log("User attendance was toggled");

    } catch (e) {
        console.log(e);
        throw e;
    }
}

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// TEST
// test data
var eventData = {
    summary: 'test 1',
    location: 'frappucino',
    description: "this is a test",
    start: {
        dateTime: '2023-06-08T17:00:00+08:00', // its the + how much that matters here that really sets the time zone
        timeZone: 'Asia/Kuala_Lumpur' // actually the timezone dont matter, it just needs to be valid (like can be found in the gcal database else it will throw invalid timezone error)
    },
    end: {
      dateTime: '2023-06-08T19:00:00+07:00', // yyyy-mm-dd is fine
      timeZone: 'Asia/Jakarta'
    },
    attendees: [
        {email: 'joe.chua@point-star.com'}, 
        {email: 'joechua247@gmail.com'}, 
        {email: 'joe.chua@demoenterprise.point-star.com', organizer: true}],
    reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 10 }]
    }
}

let eventId = "5n8de203cec2d7g65vjrvp9qd0";
// let user_email = "wuihong.khoo@point-star.com";
let user_email = "joe.chua@point-star.com";


async function fGetParticipantsForEvent (eventId) {
    console.log("Getting participants ...");
    let response = await calendar.events.get({ calendarId: 'primary', eventId: eventId, auth: client});

    console.log(response.data.attendees)
    console.log("Participants retrieved");
    // Update the attendee's status
    // const attendeeToUpdate = response.data.attendees.find((attendee) => attendee.email === user_email);
}
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// test function
async function start() {
    console.log("test starting...");
    
    // var data = await fDeleteEvent("hf6aga7i68nhcng4i4iovc4368");
    // var data = await fInsertEvent(eventData);
    // var data = await fToggleUserAttendance(eventId, user_email, 'declined')
    var data = await fGetParticipantsForEvent(eventId)

    // console.log(data); // returns event_id
    // console.log(data.id); // returns event_id
    console.log("test end");
}

start();





// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// DATA FROM INSERTING EVENT

// {
//     kind: 'calendar#event',
//     etag: '"3373436921252000"',
//     id: 'm6jb9c6mig08hscs62ujenn71k',
//     status: 'confirmed',
//     htmlLink: 'https://www.google.com/calendar/event?eid=bTZqYjljNm1pZzA4aHNjczYydWplbm43MWsgZ2NhbGVuZGFydGVzdGluZ0BnY2FsZW5kYXItMjU4OTAzLmlhbS5nc2VydmljZWFjY291bnQuY29t',
//     created: '2023-06-14T04:54:20.000Z',
//     updated: '2023-06-14T04:54:20.626Z',
//     summary: 'test 1',
//     description: 'this is a test',
//     location: 'frappucino',
//     creator: {
//       email: 'gcalendartesting@gcalendar-258903.iam.gserviceaccount.com',
//       self: true
//     },
//     organizer: {
//       email: 'gcalendartesting@gcalendar-258903.iam.gserviceaccount.com',
//       self: true
//     },
//     start: { dateTime: '2023-06-08T09:00:00Z', timeZone: 'Asia/Kuala_Lumpur' },
//     end: { dateTime: '2023-06-08T12:00:00Z', timeZone: 'Asia/Jakarta' },
//     iCalUID: 'm6jb9c6mig08hscs62ujenn71k@google.com',
//     sequence: 0,
//     attendees: [
//       {
//         email: 'joe.chua@demoenterprise.point-star.com',
//         responseStatus: 'needsAction'
//       },
//       { email: 'joechua247@gmail.com', responseStatus: 'needsAction' },
//       { email: 'joe.chua@point-star.com', responseStatus: 'needsAction' }
//     ],
//     reminders: { useDefault: false, overrides: [ [Object] ] },
//     eventType: 'default'
//   }
// so actually the only thing i need back is the event id from google 