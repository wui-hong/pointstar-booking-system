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
var userEmailDb = [];

// for authorization varification
var gTestClient;
// generate a url that asks permissions for Google Calendar scopes (AUTHORIZATION)


// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// MIDDLEWARES
// NOTHING
router.get('/', function(req, res, next) { // this is equivalent of writing /dog
    res.send('GET handler for /auth route.');
});

// ------------------------------------------------------------------------------------------------
// GOOGLE LOGIN
router.post('/login', async (req, res, next) => {
	console.log("incoming request at /login ...");

	try {
		// JWT VERIFICATION using googles npm package
		const {credential, clientId, select_by} = req.body; // this clientId here that you get from the frontend is only valid for an hour
		const oauth2Client = new OAuth2Client(process.env.CLIENT_ID);
		console.log(clientId)
		console.log(process.env.CLIENT_ID)
		async function verify() {
			const ticket = await oauth2Client.verifyIdToken({
				idToken: credential, // is the JWT of the signee
				audience: process.env.CLIENT_ID // this clientID is the same as the one in the backend (created by the developer)
			});
			let payload = ticket.getPayload();
			let userid = payload['sub'];
			let isVerified = payload.email == undefined ? false : true;
			return {isVerified: isVerified, payload: payload};
		}
		var {isVerified, payload} = await verify();

		// LOGIC AFTER VERIFICATION
		if (isVerified) {
			if (!userEmailDb.includes(payload.email)) {
				// first time user
				userEmailDb.push(payload.email);
				console.log(userEmailDb);
			}
			
			const refreshToken = jwt.sign({data: "joe@gmail.com"}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "14d" }); // set it to expire in 2 weeks 
			const accessToken = jwt.sign({data: "joe@gmail.com"}, process.env.ACCESS_TOKEN_SECRET, { expiresIn:  1000 * 60 * 30 }); // use the user's email to identify him/her, this expires in is the life span of the jwt, if notunits given, it is assumed to be in ms
		
			//put the jwtokens into the cookie storage with httponly setting
			res.cookie("refreshToken", refreshToken, {
				httpOnly: true,
				secure: false,
				maxAge: 1000 * 60 * 60 * 24 * 30, //30 days
				signed: false
			});
		
			res.cookie("accessToken", accessToken, { // res.cookie only sets the cookie value of the response but doesnt send back the response; (name, value, options)
				httpOnly: true,
				secure: false,
				maxAge: 1000 * 60 * 60, // 60mins
				signed: false
			});
		
			//store the refresh token in the db
			userSessionsDb.push(refreshToken);

			const oauth2Client = new google.auth.OAuth2(
				process.env.CLIENT_ID,
				process.env.CLIENT_SECRET,
				"http://localhost:3000" // is the page that it redirects to after the user authorizes this website
			);
			const scopes = [ 'https://www.googleapis.com/auth/calendar' ];
			// generate a url that asks permissions for Google Calendar scopes (AUTHORIZATION)
			const url = oauth2Client.generateAuthUrl({
				access_type: 'offline', // 'online' (default) or 'offline' (gets refresh_token)
				scope: scopes // If you only need one scope you can pass it as a string
			});
			
			gTestClient = oauth2Client;

			res.json({permission_url: url});
		} else {
			return res.send("login unsuccessful");
		}
	} catch (e) {
		console.log(e);
		res.send("error: " + e);
	}
});

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
// REDIRECT
router.post('/sendBackAuthorizationCode', async (req, res, next) => {
	console.log("getting the access tokens and refresh tokens...");
	console.log(req.body)
	const {code, scope} = req.body;
	console.log(code)
	gTestClient.on('tokens', (tokens) => {
		if (tokens.refresh_token) {
		  // store the refresh_token in my database!
		  console.log("refresh token exists within this object");
		  console.log(tokens.refresh_token);
		}
		console.log(tokens.access_token);
	  });

	const {tokens} = await gTestClient.getToken(code)
	gTestClient.setCredentials(tokens); //this sets alll the tokens 
	if (tokens != undefined) {
		console.log("access token");
		console.log(tokens);
	}
	res.json("end")
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
// TESTS
// TEST LOGIN
router.get('/testlogin', async (req, res, next) => {
	console.log("logging in...")
	// login thru google...
	// Assume login successful

	//everytime you sign in, you are given 1 refreshtoken, 1 accesstoken
	//sign the jwtokens
	const refreshToken = jwt.sign({data: "joe@gmail.com"}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "14d" }); // set it to expire in 2 weeks 
	const accessToken = jwt.sign({data: "joe@gmail.com"}, process.env.ACCESS_TOKEN_SECRET, { expiresIn:  1000 * 60 * 30 }); // use the user's email to identify him/her, this expires in is the life span of the jwt, if notunits given, it is assumed to be in ms

	//put the jwtokens into the cookie storage with httponly setting
	res.cookie("refreshToken", refreshToken, { // res.cookie only sets the cookie value of the response but doesnt send back the response; (name, value, options)
		httpOnly: true,
		secure: false, // if you set to true means you can only send this cookie thru a HTTPS protocol and not HTTP
		maxAge: 1000 * 60 * 60 * 24 * 30, //30 days, is the lifespan of the cookie, actually should think how to set it to be there forever OR maybe clearing of expired tokens in the DB once in a awhile
		signed: false // what does setting signed to true do?
	}); // under the name "refreshToken", with the jwt stored inside and the settings of the cookie

	res.cookie("accessToken", accessToken, { // res.cookie only sets the cookie value of the response but doesnt send back the response; (name, value, options)
		httpOnly: true,
		secure: false, // if you set to true means you can only send this cookie thru a HTTPS protocol and not HTTP
		maxAge: 1000 * 60 * 60, // 60mins, is the lifespan of the cookie
		signed: false
	}); // under the name "token", with the jwt stored inside and the settings of the cookie

	//store the refresh token in the db
	userSessionsDb.push(refreshToken);
	console.log("logged in")
	res.json("logged in");
});

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------ 
// DRAFT 2 : FIGURED OUT HOW TO GET THE ACCESS & REFRESH TOKENS, NOW NEED TO BUILD OUT THE WHOLE FLOW WITH MY AUTHENTICATION PROCESS THEN STORING THE REFRESH TOKENS FROM GOOGLE AS WELL