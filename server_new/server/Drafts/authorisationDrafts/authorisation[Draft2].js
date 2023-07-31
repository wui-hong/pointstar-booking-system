require("dotenv").config();
const axios = require('axios');
const mysql = require('mysql2');
const express = require('express');
const jwt = require("jsonwebtoken");

var router = express.Router();

// connect to DB
var users = []; // will be array of json objects containing user's email, userId, refresh token

// ------------------------------------------------------------------------------------------------
// OPEN APP
router.get('/openApp', verifyRefreshToken, async (req, res, next) => {
	console.log("opening client app...");
	const newRefreshToken = refreshRefreshToken(req.cookies.refreshToken);
	if (newRefreshToken == undefined) {
		// refresh failed, re-login
		console.log("an error occured while opening the app, please re-login")
		res.status(400).send("an error occured while opening the app, please re-login")
		return;
	}

	res.clearCookie("refreshToken");
	res.cookie("refreshToken", newRefreshToken, {
		httpOnly: true,
		secure: false,
		maxAge: 1000 * 60 * 60 * 24 * 31,
		signed: false
	});
	res.json("app was opened and new refresh token is generated : valid for the next 2 weeks")
	console.log("client app opened");
})

// ------------------------------------------------------------------------------------------------
// LOGOUT
router.get('/logout', verifyRefreshToken, (req, res, next) => {
	console.log("logging out...")

	res.clearCookie("refreshToken");
	res.clearCookie("accessToken");

	for (let i = 0; i < users.length; i++) {
		if (users[i].email == req.user.email) {
			users[i].refreshToken = undefined;
		}
	}

	res.json("user has logged out; access and refresh tokens were cleared");
	console.log("logged out")
})

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// OTHER FUNCTIONS
// verify the refresh token
async function verifyRefreshToken(req, res, next) {
	console.log("verifying refresh token...")
	const refreshToken = req.cookies.refreshToken;	
	if (refreshToken == undefined) {
		console.log("refresh token is undefined")
		res.status(400).json("no refresh token, login again")
		return;
	}

	const payload = jwt.decode(refreshToken);
	if (payload == undefined) {
		console.log("jwt cant be decoded: invalid user, need to re-login");
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		res.status(400).json("refresh token NOT verified");
		return;
	}

	try {
		for (let i = 0; i < users.length; i++) {
			if (users[i].email == payload.email) {
				var user = users[i];
				
				// user logged out
				if (user.refreshToken == undefined) {
					console.log("user is not found in the database");
					res.clearCookie("refreshToken");
					res.clearCookie("accessToken");
					res.status(400).json("user was already logged out");
					return;
				}

				// decode the refreshtoken, checks it its legit & expired
				jwt.verify(refreshToken, user.email + user.creationDate + process.env.REFRESH_TOKEN_SECRET);
				req.payload = payload;
				req.user = user;
				console.log("jwt verified; next()")
				next();
				return;
			}
		}

		console.log("user is not found in the database");
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		res.status(400).json("user not found in the database, please log in with valid google account");
	} catch (e) {
		console.log(e);
		console.log("refresh token NOT verified");
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		res.status(400).json("refresh token NOT verified");
	}
}

// ------------------------------------------------------------------------------------------------
// refresh the refresh token
async function refreshRefreshToken(token) {
	console.log("refreshing refresh token...")
	
	const payload = token.data;
	if (payload == undefined) {
		console.log("refreshment of token failed");
		return undefined;
	}

	for (let i = 0; i < users.length; i++) {
		if (users[i].email == payload.email) {
			let user = users[i];
			const newRefreshToken = jwt.sign(payload, user.email + user.creationDate + process.env.REFRESH_TOKEN_SECRET, { expiresIn: "30d" });
			console.log("refresh token is refreshed");
			return newRefreshToken;
		}
	}
	console.log("refreshment of token failed");
	return undefined;
}

module.exports = router;

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------ 
// DRAFT 2: LAST AUTHORISATION DRAFT, IM COMBING BACK THE 2 SERVERS TO 1 AUTH SERVER

// IDEA: ACCESS TOKEN & REFRESH TOKEN
// access token will be for 30 mins, secret is a generic password such that it can access all resources
// is checked whenever you access the backend server
// when expired, request for another access token using the valid refresh token

// refresh token will be for 1 month. secret is unique to user; combination of email, date of creation and generic secret in env file (this is made like this so it is harder to re-create by hacker)
// will be stored in a database => to check is just to see if its in the database
// whenever user opens the app (visit the landing page i guess), give out a new refresh token => how do we do this actually figure this out later
// if user logged in but time to expiry is 2 hours, just give out a new refresh token again
// if did not log in for a long while and refresh token expired, need to re-login


// // ------------------------------------------------------------------------------------------------
// // CHECKING REFRESH TOKEN
// router.get('/checkRefreshToken', (req, res, next) => {
// 	console.log("checking refresh token...")
// 	const refreshToken = req.cookies.refreshToken;

// 	if (refreshToken == undefined) {
// 		console.log("no refresh token please log in again");
// 		res.status(400).send("no refresh token please log in again")
// 		return;
// 	}
// 	console.log("refreshtoken was sent here")
// 	const isLoggedIn = userSessionsDb.includes(refreshToken);
// 	console.log(isLoggedIn)
// 	try {
// 		const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
// 		if (isLoggedIn) {
// 			// IF ITS VERIFIED & LOGGED IN
// 			console.log("refresh token verified");
// 			res.json(isLoggedIn);
// 			return;
// 		}
// 		// IF ITS VERIFIED BUT NOT LOGGED IN ANYMORE
// 		res.status(400).send("Log in again!");
// 	} catch (e) {
// 		console.log(e);
// 		// if failed verification due to expiry, remove the session from the storage (currently this is a damn inefficient setup first)
// 		if (isLoggedIn) {
// 			for (let i = 0; i < userSessionsDb.length; i++) {
// 				if (refreshToken == userSessionsDb[i]) {
// 					userSessionsDb[i] = undefined;
// 				}
// 			}
// 		}
// 		res.clearCookie("refreshToken");
// 		res.clearCookie("accessToken");
// 		console.log("refresh token NOT verified");
// 		res.status(400).send(e);
// 	}
// })