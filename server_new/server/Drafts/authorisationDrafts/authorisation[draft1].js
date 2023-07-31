require("dotenv").config();
const axios = require('axios');
const mysql = require('mysql2');
const express = require('express');
const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');
const jwt = require("jsonwebtoken");

var router = express.Router();

// connect to DB
var userSessionsDb = []; //temp DB be4 i create a real mysql db

// ------------------------------------------------------------------------------------------------
// REDIRECT
router.post('/sendBackAuthorizationCode', async (req, res, next) => {
	console.log("getting the access tokens and refresh tokens...");
	const {code, scope} = req.body;
	try {
		const oauth2Client = new google.auth.OAuth2(
			process.env.CLIENT_ID,
			process.env.CLIENT_SECRET,
			"http://localhost:3000" // is the page that it redirects to after the user authorizes this website
		);
		const {tokens} = await oauth2Client.getToken(code);
		console.log(tokens);
		if (tokens.refresh_token != undefined) {
			console.log("refresh token received")
			userSessionsDb.push(tokens.refresh_token);
			res.cookie("refreshToken", tokens.refresh_token, {
				secure: false,
				httpOnly: true,
				maxAge: 120000
			});
			res.cookie("accessToken", tokens.access_token, {
				secure: false,
				httpOnly: true,
				maxAge: 120000
			});
			res.json("authorisation was successful");
			console.log("authorisation was successful");
		} else {
			res.status(500).send("error: refresh token was not created");
			console.log("error: refresh token was not created");
		}
	} catch (e) {
		console.log(e);
		res.status(500).send('error: ' + e);
	}
})
// ------------------------------------------------------------------------------------------------
// CHECKING REFRESH TOKEN
router.get('/checkRefreshToken', (req, res, next) => {
	console.log("checking refresh token...")
	const refreshToken = req.cookies.refreshToken;

	if (refreshToken == undefined) {
		console.log("no refresh token please log in again");
		res.status(400).send("no refresh token please log in again")
		return;
	}
	console.log("refreshtoken was sent here")
	const isLoggedIn = userSessionsDb.includes(refreshToken);
	console.log(isLoggedIn)
	try {
		const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
		if (isLoggedIn) {
			// IF ITS VERIFIED & LOGGED IN
			console.log("refresh token verified");
			res.json(isLoggedIn);
			return;
		}
		// IF ITS VERIFIED BUT NOT LOGGED IN ANYMORE
		res.status(400).send("Log in again!");
	} catch (e) {
		console.log(e);
		// if failed verification due to expiry, remove the session from the storage (currently this is a damn inefficient setup first)
		if (isLoggedIn) {
			for (let i = 0; i < userSessionsDb.length; i++) {
				if (refreshToken == userSessionsDb[i]) {
					userSessionsDb[i] = undefined;
				}
			}
		}
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		console.log("refresh token NOT verified");
		res.status(400).send(e);
	}
})

// ------------------------------------------------------------------------------------------------
// LOGOUT
router.get('/logout', verifyRefreshToken, (req, res, next) => {
	console.log("logging out...")

	res.clearCookie("refreshToken");
	res.clearCookie("accessToken");

	// clear the refreh token in the db
	userSessionsDb = userSessionsDb.filter(token => token !== req.cookies.refreshToken);
	console.log(userSessionsDb);

	res.json("user has logged out; access and refresh tokens were cleared");
	console.log("logged out")
})

// ------------------------------------------------------------------------------------------------
// OPEN APP
router.get('/openApp', verifyRefreshToken, async (req, res, next) => {
	// for web apps, make it such that the person refreshes his or her token each time that they open the app
	const newRefreshToken = refreshRefreshToken(req.cookies.refreshToken); // req has req.ccokies.refreshToken attached to it
	res.clearCookie("RefreshToken");
	res.cookie("refreshToken", newRefreshToken, { // res.cookie only sets the cookie value of the response but doesnt send back the response; (name, value, options)
		httpOnly: true,
		secure: false, // if you set to true means you can only send this cookie thru a HTTPS protocol and not HTTP
		maxAge: 1000 * 60 * 60 * 24 * 30, //30 days, is the lifespan of the cookie, actually should think how to set it to be there forever OR maybe clearing of expired tokens in the DB once in a awhile
		signed: false // what does setting signed to true do?
	}); // under the name "refreshToken", with the jwt stored inside and the settings of the cookie
	res.json("app was opened and new refresh token is generated : valid for the next 2 weeks")
})

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// OTHER FUNCTIONS
// verify the refresh token
async function verifyRefreshToken(req, res, next) {
	const refreshToken = req.cookies.refreshToken;
	
	// check if the refresh token is inside the storage => 2nd layer to check if the person still logged in, or session revoked
	const isLoggedIn = userSessionsDb.includes(refreshToken);

	try {
		// verify that its a refresh token produced by us & that its not passed the expiry (verify checks the secret & the expiry time)
		const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); // jwt.verify also checks if the jwt has expried already or not
		if (isLoggedIn) {
			console.log("refresh token verified");
			// res.json("refresh token verified") // cannot set headers now as need to set it again; basically can only send the http response back once 
			next();
			return;
		}
		console.log("refresh token NOT in session DB already");
	} catch (e) {
		console.log(e);
		// if failed verification due to expiry, remove the session from the storage (currently this is a damn inefficient setup first)
		if (isLoggedIn) {
			for (let i = 0; i < userSessionsDb.length; i++) {
				if (refreshToken == userSessionsDb[i]) {
					userSessionsDb[i] = undefined;
				}
			}
		}
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		console.log("refresh token NOT verified");
		res.json("refresh token NOT verified");
	}
}

// ------------------------------------------------------------------------------------------------
// refresh the refresh token
async function refreshRefreshToken(token) { // this is called if refresh token has been verified
	// if it reaches here, means the token is valid and not expired yet
	const refreshToken = token;
	user = refreshToken.data; // send the user detail in the user property of req
	console.log(user);
	const newRefreshToken = jwt.sign({data: user}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "14d" }); // set it to expire in 2 weeks again
	console.log("generated a new refresh token");
	return newRefreshToken;
}

module.exports = router;

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------ 
// DRAFT 1 : NO NEED TO CREATE MY OWN REFRESH AND ACCESS TOKENS. JUST USE GOOGLE'S REFRESH & ACCESS TOKENS, THEN STORE GOOGLE'S REFRESH TOKENS IN MY DB (IS SENSITIVE, SO SHOULD ONLY BE USED AT THE BACKEND)
// CORRECTION, FOR THIS PROJECT THE MAIN THING IS JUST TO GET THEM TO LOG IN USING AUTHENTICATION THEN I WILL HANDLE THE SESSIONS MYSELF.
// NEXT WE WILL JUST USE THE SERVICE ACCOUNT TO ACCESS THE GOOGLE API; THIS WILL BE LIKE A MAIN CONTROLLER OF WHAT U CAN ACCESS
// NEXT DRAFT I WILL RESET ALOT OF THINGS 