require("dotenv").config();
const axios = require('axios');
const express = require('express');
const router = require('express').Router();
const cors = require("cors");
const mysql = require('mysql2');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const {OAuth2Client} = require('google-auth-library');

const app = express();
const store = new session.MemoryStore();

// Necessary middlewares
app.use(express.json()); //parses the body as json
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(cookieParser());
app.use(session({ // using this middleware attaches a session property to every request object you receive back & also send out the session cookie to the client in the res obj as well 
	secret: "secret", // is the secret that you use to validate the cookie was the one you sent out
	cookie: { maxAge: 20000 }, // in ms => so this is 20 seconds
	saveUninitialized: true, //forces a session that is uninitialized to be saved to the store
	resave: true, // is whether you want to save the session again even if you didnt modify the session
	store: store
}));

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
//on the server at kPort
const kPort = process.env.PORT || 8080;
app.listen(kPort)
console.log(`app is listening on port ${kPort}`)

// ------------------------------------------------------------------------------------------------
// connect to DB
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
		const {credential, clientId, select_by} = req.body;
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
			// 2) whether yes or no, after that create a new user session in the storage
			// 3) need to pass the session to the client => so that every time the client visits the server, the session is validated by the server
			console.log("session store b4: ");
			console.log(store.sessions);

			if (req.session.authenticated) {
				console.log("is session authenticated? ans: " + req.session.authenticated);
				res.json(req.session);
			} else {
				console.log("creating a new session...");
				
				// create a session & send to the client
				req.session.authenticated = true;
				req.session.username = payload;
				req.session.save(); // have to write the save() function to explicitly save into the memory storage, the location is as dictated in the middleware
				
				return res.json(req.session); //automatically sends and set the cookie response, so actually this just sends the session in the res.body
			}

			console.log("session store after: ");
			console.log(store.sessions);
		} else {
			return res.send("login unsuccessful");
		}
	} catch (e) {
		console.log(e);
		res.send("error: " + e);
	}
});

app.get('/logout', (req, res, next) => {
	console.log("logging out...")

	console.log(store.sessions);
	console.log(req.session)
	req.session.authenticated = true;
	// req.session.destroy(); // this destroys the current cookie session in the request
	console.log(store.sessions);
	res.send("hello") //dont even need to explicitly state the cookie in the res obj as express-session helps you to incorporate the cookie already

	console.log("logged out")
})

async function validateSession(req, res, next) {
	console.log("validating session...")
	
	console.log("req session: ")
	console.log(req.session)

	console.log("session storage: ")
	console.log(store)

	let isValidated = false;
	

	
	if (isValidated) {
		
		
		console.log("Session is validated!")
		next();
	} else {
		console.log("Session validation failed")
		res.send("Either cookie has expired or you are not logged in");
	}

	console.log(user + " session validated")
}

// POSSIBLY USEFUL CODE FROM CHATGPT 
// const sessionStore = new MySQLStore({
// 	clearExpired: true,
// 	checkExpirationInterval: 900000, // Check every 15 minutes
// 	expiration: 86400000, // Session expires after 24 hours
// 	createDatabaseTable: true,
// 	schema: {
// 	  tableName: 'sessions',
// 	  columnNames: {
// 		session_id: 'session_id',
// 		expires: 'expires',
// 		data: 'data'
// 	  }
// 	}
//   }, pool);
  
//   app.use(session({
// 	secret: 'your-secret-key',
// 	resave: false,
// 	saveUninitialized: false,
// 	store: sessionStore
//   }));

  // Middleware to refresh session token
// app.use((req, res, next) => {
// 	if (req.session && req.session.cookie && req.session.cookie.expires) {
// 	  const currentTime = new Date().getTime();
// 	  const sessionExpiryTime = new Date(req.session.cookie.expires).getTime();
// 	  const refreshThreshold = 60000; // Refresh token if within 1 minute of expiry
  
// 	  if (sessionExpiryTime - currentTime < refreshThreshold) {
// 		req.session.cookie.expires = new Date(Date.now() + sessionStore.options.expiration);
// 		sessionStore.set(req.sessionID, req.session, (error) => {
// 		  if (error) {
// 			console.error('Error refreshing session token:', error);
// 		  }
// 		});
// 	  }
// 	}
  
// 	next();
//   });

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// DRAFT 2 : FIGURED OUT THAT TO MAKE USER SESSIONS ON THE SERVER, YOU DONT NECESSARILY NEED THE PASSPORT PACKAGE (PASSPORT JUST HELPS YOU TO HANDLE THIS SESSION PART)
// FIGURED OUT THAT EXPRESS SESSIONS HELP TO ATTACH A COOKIE TO THE HTTP REQS AND RES OBJS SO THAT THESE SESSIONS THAT ARE TRANSFERRED TO THE SERVER SIDE VIA COOKIES
// CAN BE VALIDATED VIA THE SECRET CODE THAT WAS PRESET BEFORE.
// EXPERIMENTING WITH THE EXPRESS-SESSION NPM, FOUND OUT THEY AUTO SEND & SET THE COOKIE BY DEFAULT, BUT HAVE TO CALL A SAVE() FUNCTION TO SAVE THE COOKIE IN THE STORAGE
// UPDATE : REALISED THAT THERE ARE 2 WAYS OF MANAGING USER SESSIONS -> 1. JW TOKENS 2. SESSION TOKENS
// CAN REFER TO NOTION FOR THE DIFFERENCES AS TO WHY PPL USE DIFFERENT METHODS TO IMPLEMENT SESSION MANAGEMENT BUT IN THE APP THAT I WILL CREATE, I WILL USE JWT
// AS THE APP DOES NOT NEED TO BE SO SECURE. BOTH METHODS WILL USE COOKIES AND IN THE HTTP ONLY ACCESSIBLE COOKIE STORAGE TO PREVENT XSS ATTACKS FROM OTHER MALICIOUS SCRIPTS
// IN DRAFT 3 WILL SEE THAT IM NOT USING EXPRESS-SESSION NPM ANYMORE AND WILL SWITCH TO JWT NPM
