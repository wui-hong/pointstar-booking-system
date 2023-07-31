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
        console.log(res.data);
        return res.data;
    } catch (e) {
        console.log(e);
        throw e;
    }
}

var fDeleteEvent = async (eventId) => {
    try {
        var res = await calendar.events.delete({
            auth: client,
            calendarId: 'primary',
            eventId: eventId,
        });
        console.log(res.data);
        console.log("event was deleted");
        return res.data;
    } catch (e) {
        console.log(e);
        throw e;
    }
}

var fToggleUserAttendance = async (eventId, user_email, action) => {
    try {
        var res = await calendar.events.get

        return action.db;
    } catch (e) {
        console.log(e);
        throw e;
    }
}

var fToggleUserAttendance = async (eventId, user_email, action) => {
    console.log("Toggling user attendance...");
    try {
        // get event details
        let response = await calendar.events.get({ calendarId: 'primary', eventId: eventId, auth: client});

        // Update the attendee's status
        const attendeeToUpdate = response.data.attendees.find((attendee) => attendee.email === user_email);
        if (attendeeToUpdate) {
            attendeeToUpdate.responseStatus = action; // if status not valid, err will be thrown, Set to the desired status: "needsAction" - unconfirmed, "accepted" - confirmed, "declined" - decline
            console.log("attendee status was set to accepted");
        }
        
        // Update the event
        var res = await calendar.events.update({ calendarId: 'primary', eventId: eventId, resource: response.data, auth: client});
        console.log("User attendance was toggled");
    } catch (e) {
        console.log(e);
        throw e;
    }
}

var fGetParticipantsForEvent = async (eventId) => {
    console.log("Getting participants ...");
    let response = await calendar.events.get({ calendarId: 'primary', eventId: eventId, auth: client}); // returns [ {email:..., responseStatus:...} ]
    console.log(response.data.attendees)
    console.log("Participants retrieved");
    return response.data.attendees;
}

module.exports.fInsertEvent = fInsertEvent;
module.exports.fDeleteEvent = fDeleteEvent;
module.exports.fToggleUserAttendance = fToggleUserAttendance;
module.exports.fGetParticipantsForEvent = fGetParticipantsForEvent;
    
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// IDEA : have a main calendar that has all events so that people will know the available timings
// Just invite all the attendees then the organizer is noted in the database
// bookings are made through this app, such that events are shown on google calendar 
// BUT bookings cannot be made through google calendar

