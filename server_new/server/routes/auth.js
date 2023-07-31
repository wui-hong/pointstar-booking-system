require("dotenv").config();
const axios = require('axios');
const mysql = require('mysql2');
const express = require('express');
const {OAuth2Client} = require('google-auth-library');
const jwt = require("jsonwebtoken");

const router = express.Router();

// connect to DB
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
// MIDDLEWARES
// GOOGLE LOGIN
router.post('/login', login);

// ------------------------------------------------------------------------------------------------
// OPEN APP
router.get('/openApp', verifyRefreshToken, refreshRefreshToken, refreshAccessToken, openApp);

// ------------------------------------------------------------------------------------------------
// LOGOUT
router.get('/logout', verifyRefreshToken, logout);

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// END POINT FUNCTIONS
// LOGIN
async function login (req, res, next) {
	console.log("incoming request at /login ...");
	try {
		const {credential} = req.body;
		const {isVerified, payload} = await verifyAuthenticationIdToken(new OAuth2Client(process.env.CLIENT_ID), credential);
		delete payload.exp
		const userEmail = payload.email;
		var joinDateTime = new Date(); // can only use less than or more than; cannot use equality operators; example: Sun Jun 11 2023 21:19:14 GMT+0700 (Western Indonesia Time)

		var dbRes = await promisePool.query(`SELECT * FROM users;`);
		var users = dbRes[0]; // the 0 index has the array of data
		
		// IF GOOGLE LOGIN SUCCESSFUL
		if (isVerified) {
			let user = users.filter((u) => {return u.user_email == userEmail})[0]; //if no user it will be undefined

			if (user == undefined) {
				console.log("new user...")
				// insert into db, creating the user from the payload
				user = {
					// id: users.length == 0 ? 0 : users[users.length - 1].id + 1, // add 1 to the last user added, in case got users that were deleted in between; number is being auto-incremented in the db aleady
					user_email: userEmail,
					full_name: payload.name, 
					image_url: payload.picture,
					join_date_time: joinDateTime,
					last_login: joinDateTime,
					login_status: 1
				}
				var dbRes = await promisePool.query(`
					INSERT INTO pointstarBookingSystem.users (user_email, full_name, image_url, join_date_time, last_login, login_status)
					VALUES ("${user.user_email}", "${user.full_name}", "${user.image_url}", "${user.join_date_time}", "${user.last_login}", "${user.login_status}");
				`);
				// console.log(dbRes[0].insertId) // can find the id of the user from the response 
				// [
				// 	ResultSetHeader {
				// 	  fieldCount: 0,
				// 	  affectedRows: 1,
				// 	  insertId: 11,
				// 	  info: '',
				// 	  serverStatus: 2,
				// 	  warningStatus: 0
				// 	},
				// 	undefined
				// ]
				payload.user_id = dbRes[0].insertId;
				console.log("new user added to db!")
			} else {
				// RECURRING USER
				console.log("recurring user...")
				// update the join_date_time
				joinDateTime = user.join_date_time;
				// update login status
				let response = await promisePool.query(`
					UPDATE users
					SET login_status = 1
					WHERE user_email = "${user.user_email}";
					SELECT * FROM users
					WHERE user_email = "${user.user_email}";
				`);
				payload.user_id = response[0][0].user_id;
				console.log(response[0][0])
			}
			const refreshTokenSecret = userEmail + joinDateTime + process.env.REFRESH_TOKEN_SECRET;
			const refreshToken = jwt.sign(payload, refreshTokenSecret, { expiresIn: "30d" });
			const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn:  1000 * 60 * 30 });

			res.cookie("refreshToken", refreshToken, {
				httpOnly: true,
				secure: false,
				maxAge: 1000 * 60 * 60 * 24 * 31,
				signed: false,
				// sameSite: "none"
			});
			res.cookie("accessToken", accessToken, {
				httpOnly: true,
				secure: false,
				maxAge: 1000 * 60 * 31,
				signed: false,
				// sameSite: "none"
			});
			console.log(payload)
			res.json(payload);
		} else {
			res.status(401).send("login unsuccessful");
			console.log("authentication unsuccessful")
		}
	} catch (e) {
		console.log(e);
		res.status(401).send("error: " + e);
	}
}

// ------------------------------------------------------------------------------------------------
// OPEN APP
async function openApp (req, res, next) {
	console.log("opening client app...");
	console.log("client app app was opened, new refresh & access tokens were generated : refresh tokens are valid for the next 1 month & access tokens are valid for the next 45 mins");
	res.json(req.payload);
}

// ------------------------------------------------------------------------------------------------
// LOGOUT
async function logout (req, res, next) {
	console.log("logging out...")

	res.clearCookie("refreshToken");
	res.clearCookie("accessToken");

	// update login status	
	try {
		await promisePool.query(`
			UPDATE users
			SET login_status = 0
			WHERE user_email = "${req.payload.email}"
		`);
	} catch (e) {
		console.log(e)
		res.status(401).json(e)
	}

	res.json("user has logged out; access and refresh tokens were cleared");
	console.log("logged out")
}

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// MIDDLEWARE FUNCTIONS
// REFRESH ACCESS TOKEN
async function refreshAccessToken (req, res, next) {
	console.log("refreshing access token...");
	const accessToken = jwt.sign(req.payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn:  1000 * 60 * 30 });
	res.clearCookie("accessToken");
	res.cookie("accessToken", accessToken, {
		httpOnly: true,
		secure: false,
		maxAge: 1000 * 60 * 31,
		signed: false
	});
	console.log("access token is refreshed");
	next();
}

// ------------------------------------------------------------------------------------------------
// REFRESH REFRESH TOKEN
async function refreshRefreshToken (req, res, next) {
	console.log("refreshing refresh token...");

	const payload = jwt.decode(req.cookies.refreshToken);
	if (payload == undefined) {
		console.log("FAILED to refresh");
		return undefined;
	}
	delete payload.exp

	// get the user from the DB and set the new refresh token
	let dbRes = await promisePool.query(`SELECT * FROM users;`);
	let users = dbRes[0]; // the 0 index has the array of data

	if (payload.email == undefined || payload.email == '') {
		res.status(401).json("Users email is undefined, need to re-login again");
		return;
	}

	for (let i = 0; i < users.length; i++) {
		if (users[i].user_email == payload.email) {
			let user = users[i];
			const newRefreshToken = jwt.sign(payload, user.user_email + user.join_date_time + process.env.REFRESH_TOKEN_SECRET, { expiresIn: "30d" }); //by setting expiry on jwt, it auto adds a exp property to the payload
			res.clearCookie("refreshToken");
			res.cookie("refreshToken", newRefreshToken, {
				httpOnly: true,
				secure: false,
				maxAge: 1000 * 60 * 60 * 24 * 31,
				signed: false
			});
			console.log("refresh token is refreshed");
			next()
			break;
		}
	}
}

// ------------------------------------------------------------------------------------------------
// VERIFY THE REFRESH TOKEN
async function verifyRefreshToken(req, res, next) { // sets req.payload & req.user
	console.log("verifying refresh token...")

	const refreshToken = req.cookies.refreshToken;
	if (refreshToken == undefined) {
		console.log("refresh token is undefined");
		res.status(401).json("no refresh token, login again");
		return;
	}

	const payload = jwt.decode(refreshToken);
	if (payload == undefined) {
		console.log("jwt cant be decoded: invalid user, need to re-login");
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		res.status(401).json("refresh token cannot be decoded and is invalid");
		return;
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
					console.log("user was logged out, need to re-login again");
					res.clearCookie("refreshToken");
					res.clearCookie("accessToken");
					res.status(401).json("user was logged out, need to re-login again");
					return;
				}

				// decode the refreshtoken, checks if its legit & expired
				var tokenSecret = user.user_email + user.join_date_time + process.env.REFRESH_TOKEN_SECRET;
				console.log(tokenSecret)
				jwt.verify(refreshToken, tokenSecret);
				req.payload = payload;
				req.user = user;
				console.log("jwt verified; next()");
				next();
				return;
			}
		}

		console.log("user is not found in the database");
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		res.status(401).json("user not found in the database, please log in with valid google account");
	} catch (e) {
		console.log("refresh token FAILED to verify");
		res.clearCookie("refreshToken");
		res.clearCookie("accessToken");
		res.status(401).json("refresh token NOT verified");
	}
}

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
// DRAFT 3: NOW IM COMBINING BACK THE AUTH SERVER AS IT SEEMS BETTER TO JUST HAVE IT ALL UNDER 1 AUTH AND NOT SPLIT IT SO MUCH
// REFER BACK TO AUTHENTICATION & AUTHORISATION DRAFT 2 FOR MOST UPDATED REFERENCES!

// Error 400 400 Bad Request
// The HyperText Transfer Protocol (HTTP) 400 Bad Request response status code indicates that the server cannot or
// will not process the request due to something that is perceived to be a client error 
// (for example, malformed request syntax, invalid request message framing, or deceptive request routing).
// WILL USE THIS WHEN THE CLIENT SENDS WRONG INFO LIKE UNDEFINED VALUES 

// Error 401 Unauthorized Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
// USE THIS WHEN TOKENS OR LOGIN FAIL

// Error 403 Forbidden The request contained valid data and was understood by the server, but the server is refusing action.
// This may be due to the user not having the necessary permissions for a resource or needing an account of some sort,
// or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
// This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge,
// but the server did not accept that authentication. The request should not be repeated.

// Error 500 Internal Server Error. The HyperText Transfer Protocol (HTTP) 500 Internal Server Error server error
// response code indicates that the server encountered an unexpected condition that prevented it from fulfilling
// the request. This error response is a generic "catch-all" response. Usually, this indicates the server 
// cannot find a better 5xx error code to response. Sometimes, server administrators log error responses like the
//  500 status code with more details about the request to prevent the error from happening again in the future.
// MIGHT USE THIS FOR WHEN CONNECTION OR QUERIES TO THE DB FAILED AND NEEDS CHECKING ON MY BACKEND

// e.g of google account
// {
// 	iss: 'https://accounts.google.com',
// 	nbf: 1686496341,
// 	aud: '930971578233-co8ptnobgutss87mpjptnjcsdj4a1l1q.apps.googleusercontent.com',
// 	sub: '113153969220988135075',
// 	hd: 'point-star.com',
// 	email: 'joe.chua@point-star.com',
// 	email_verified: true,
// 	azp: '930971578233-co8ptnobgutss87mpjptnjcsdj4a1l1q.apps.googleusercontent.com',
// 	name: 'Joe Chua',
// 	picture: 'https://lh3.googleusercontent.com/a/AAcHTtfLDut0op2OPsBimveqwjDfadjFcqe-q2JzNOeY=s96-c',
// 	given_name: 'Joe',
// 	family_name: 'Chua',
// 	iat: 1686496641,
// 	exp: 1686500241,
// 	jti: '9e1c47d3db333b2884130bda1b58a1554afa55a1'
//   }

// boiler plate code of try-catch statement
// try {	
// } catch (e) {
// 	console.log(e);
// 	res.status(401).json(e);
// }