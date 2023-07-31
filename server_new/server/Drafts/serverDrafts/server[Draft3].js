require("dotenv").config();
const axios = require('axios');
const express = require('express');
const cors = require("cors");
const mysql = require('mysql2');
const cookieParser = require("cookie-parser");
const {OAuth2Client} = require('google-auth-library');
const jwt = require("jsonwebtoken");

const app = express();

// Necessary middlewares
app.use(express.json()); //parses the body as json
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(cookieParser());

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
//on the server at kPort
const kPort = process.env.PORT || 8080;
app.listen(kPort)
console.log(`app is listening on port ${kPort}`)

// ------------------------------------------------------------------------------------------------
// connect to DB

var userSessionsDb = [];

// const pool = mysql.createPool({
// 	host: process.env.MYSQL_HOST,
// 	user: process.env.MYSQL_USER,
// 	password: process.env.MYSQL_PASSWORD,
// 	datatbase: process.env.MYSQL_DATABASE
// }).promise()

// async function getData() {
// 	const [rows] = await pool.query("SELECT * FROM data")
// 	return rows
// }

// const data = getData()
// console.log(data)

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// Middlewares
// GOOGLE LOGIN FROM THE FRONT END
app.post('/login', async (req, res, next) => {
	console.log("incoming request at /login ...");

	try {
		// JWT VERIFICATION using googles npm package
		const {credential, clientId, select_by} = req.body; // this clientId here that you get from the frontend is only valid for an hour
		const client = new OAuth2Client(clientId);
		async function verify() {
			const ticket = await client.verifyIdToken({
				idToken: credential, // the token is the credential
				audience: clientId
			});
			let payload = ticket.getPayload();
			let userid = payload['sub'];
			let isVerified = payload.email == undefined ? false : true;
			return {isVerified: isVerified, payload: payload};
		}
		var {isVerified, payload} = await verify() //async functions return a promise, so you need to await

		// LOGIC AFTER VERIFICATION
		if (isVerified) { //check if its verified; if user has logged in correctly
			// 1) need to check if the user is a first time user of the platform, if yes, then create a new profile for them in our DB
			// 2) whether yes or no, after that create a new user session
			// 3) need to pass the session to the client => so that every time the client visits the server, the session is validated by the server
			
 			const token = jwt.sign(payload.email, process.env.CLIENT_SECRET, { expiredIn: "1h"}); // use the user's email to identify him/her
			 
			res.cookie("token", token, {
				httpOnly: true,
				secure: false, // if you set to true means you can only send this cookie thru a HTTPS protocol and not HTTP
				maxAge: 20000, //20 seconds
				signed: false
			}); // under the name "token", with the jwt stored inside and the settings of the cookie

		} else {
			return res.send("login unsuccessful");
		}
	} catch (e) {
		console.log(e);
		res.send("error: " + e);
	}
});

// ------------------------------------------------------------------------------------------------
//LOGOUT
app.get('/logout', verifyRefreshToken, (req, res, next) => {
	console.log("logging out...")

	//clear the refresh token
	res.clearCookie("refreshToken");

	res.send("logged out") //dont even need to explicitly state the cookie in the res obj as express-session helps you to incorporate the cookie already
	console.log("logged out")
})

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
//TESTS
// test log in
app.get('/testlogin', async (req, res, next) => {
	console.log("loggin in...")
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
// test open app
app.get('/testopenApp', verifyRefreshToken, async (req, res, next) => {
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
// test log out
app.get('/testlogout', verifyRefreshToken, async (req, res, next) => {
	// clear the cookies 
	res.clearCookie("refreshToken");
	res.clearCookie("accessToken");

	// clear the refreh token in the db
	userSessionsDb = userSessionsDb.filter(token => token !== req.cookies.refreshToken);
	console.log(userSessionsDb);

	res.json("user has logged out; access and refresh tokens were cleared");
})

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// OTHER FUNCTIONS
// verify the refresh token
async function verifyRefreshToken(req, res, next) {
	console.log("Verifying refresh token...");
	const cookies = req.cookies;
	console.log("cookies : ");
	console.log(cookies);
	const refreshToken = req.cookies.refreshToken;
	console.log("refreshToken : ");
	console.log(refreshToken);

	// check if the refresh token is inside the storage => 2nd layer to check if the person still logged in, or session revoked
	const isLoggedIn = userSessionsDb.includes(refreshToken);

	try {
		// verify that its a refresh token produced by us & that its not passed the expiry (verify checks the secret & the expiry time)
		const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET); // jwt.verify also checks if the jwt has expried already or not
		if (isLoggedIn) {
			console.log("refresh token verified");
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
	const newRefreshToken = jwt.sign({data: user}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "14d" }); // set it to expire in 2 weeks again
	console.log("generated a new refresh token");
	return newRefreshToken;
}

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------ 
// DRAFT 3 : NO NEED TO HAVE A SEPERATE DB FOR THE USER SESSION SINCE WE ARE VERIFYING USING JWT AND NOT SESSION TOKENS ALREADY. (siked, refresh tokens are somewhat similar to session_ids)
// FOR THE SUPERTOKENS METHOD, FOUND OUT THAT THERE ARE 2 TYPES OF TOKENS, ACCESS TOKENS & REFRESH TOKENS. ACCESS TOKENS GIVE USERS THE ACCESS TO THE RESOURCE SERVER,
// WHILE THE REFRESH TOKENS GIVE ACCESS TO THE AUTH SERVER => WHICH HELPS TO VALIDATE THE JWTS AND ALSO HELP RENEW THE ACCESS TOKENS WHEN THEY HAVE EXPIRED
// REFRESH TOKENS ARE LIKE SESSION ID WHERE THEY ARE STORED IN A DATABASE AS WELL AND HELP MANAGE THE CURRENT SESSION.
// WHEN YOU LOG OUT, THE REFRESH TOKEN IS REVOKED, SO YOU WONT BE ABLE TO RENEW YOUR ACCESS TOKEN TO A NEW JWT ALREADY. => CAN PREVENT LOG IN IF NO MORE REFRESH TOKEN EVEN IF THERE IS ACCESS TOKEN
// IN MY NEXT DRAFT I NEED TO HAVE ALL THE AUTHENTICATION ROUTES SET UP : LOGIN, VERIFY GOOGLE ID, SET ACCESS TOKEN & REFRESH TOKEN, MANAGE THE REFRESHING OF ACCESS TOKEN
// MANAGE THE LOGOUT BY REMOVING THE REFRESH TOKEN
// NOW ALSO REALISE THAT THE ROUTES CAN BE SEPARATED TO DIFFERENT MODULES TO HAVE NEATER CODE : NEXT DRAFT WILL REQUIRE THE DIFFERENT DESIGNATIONS

// write down the difference cookie, express-session, jwt, access tokens, refresh tokens




// verify the access token => this should be in the resource server and not the auth server
// async function verifyAccessToken(req, res, next) {
// }

// verifying a JWT async vs sync version :
// // verify a token symmetric - synchronous
// var decoded = jwt.verify(token, 'shhhhh');
// console.log(decoded.foo) // bar

// // verify a token symmetric
// jwt.verify(token, 'shhhhh', function(err, decoded) {
//   console.log(decoded.foo) // bar
// });

// // invalid token - synchronous
// try {
//   var decoded = jwt.verify(token, 'wrong-secret');
// } catch(err) {
//   // err
// }

// // invalid token
// jwt.verify(token, 'wrong-secret', function(err, decoded) {
//   // err
//   // decoded undefined
// });