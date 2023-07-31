require("dotenv").config();
const axios = require('axios');
const mysql = require('mysql2');
const express = require('express');
const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');
const jwt = require("jsonwebtoken");

var router = express.Router();

// connect to DB
var userEmailDb = [];
var gClient;

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// MIDDLEWARES
// GOOGLE LOGIN
router.post('/login', async (req, res, next) => {
	console.log("incoming request at /login ...");
	try {
		// JWT VERIFICATION using googles npm package
		const {credential, clientId, select_by} = req.body; // this credential here that you get from the frontend is only valid for an hour	
		const {isVerified, payload} = await verifyAuthenticationIdToken(new OAuth2Client(process.env.CLIENT_ID), credential);

		// IF GOOGLE LOGIN SUCCESSFUL
		if (isVerified) {
			// FOR FIRST TIME USERS, ADD INTO DB
			if (!userEmailDb.includes(payload.email)) {
				userEmailDb.push(payload.email);
			}
			
			// CREATE OAUTH2 CLIENT TO FOR AUTHORIZATION
			const oauth2Client = new google.auth.OAuth2(
				process.env.CLIENT_ID,
				process.env.CLIENT_SECRET,
				"http://localhost:3000" // is the page that it redirects to after the user authorizes this website
			);
			const scopes = [ 'https://www.googleapis.com/auth/calendar' ];
			const url = oauth2Client.generateAuthUrl({
				access_type: 'offline',
				scope: scopes,
				include_granted_scopes: true,
				prompt: 'consent'
			});
			gClient = oauth2Client;
			res.json({permission_url: url, userPayload: payload, oauth2Client});
			console.log("url sent back")
			//CONTINUE AT SEND BACK AUTHORIZATION CODE
		} else {
			return res.send("login unsuccessful");
			console.log("authentication unsuccessful")
		}

	} catch (e) {
		console.log(e);
		res.send("error: " + e);
	}
});

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// OTHER FUNCTIONS
// VERIFY THE ID TOKEN FROM THE CLIENT SIDE
async function verifyAuthenticationIdToken(oauth2Client, idToken) {
	const ticket = await oauth2Client.verifyIdToken({
		idToken: idToken,
		audience: process.env.CLIENT_ID
	});
	let payload = ticket.getPayload();
	let userid = payload['sub'];
	let isVerified = payload.email == undefined ? false : true;
	return {isVerified: isVerified, payload: payload};
}

module.exports = router;

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------ 
// DRAFT 1 : NO NEED TO CREATE MY OWN REFRESH AND ACCESS TOKENS. JUST USE GOOGLE'S REFRESH & ACCESS TOKENS, THEN STORE GOOGLE'S REFRESH TOKENS IN MY DB (IS SENSITIVE, SO SHOULD ONLY BE USED AT THE BACKEND)
// CORRECTION, FOR THIS PROJECT THE MAIN THING IS JUST TO GET THEM TO LOG IN USING AUTHENTICATION THEN I WILL HANDLE THE SESSIONS MYSELF.
// NEXT WE WILL JUST USE THE SERVICE ACCOUNT TO ACCESS THE GOOGLE API; THIS WILL BE LIKE A MAIN CONTROLLER OF WHAT U CAN ACCESS
// NEXT DRAFT I WILL RESET ALOT OF THINGS 