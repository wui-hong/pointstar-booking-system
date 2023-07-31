// import mysql from 'mysql2'; // dont use import statements on server side as it is not a module

require("dotenv").config();
const axios = require('axios');
const express = require('express');
const router = require('express').Router();
const cors = require("cors");
const mysql = require('mysql2');
const session = require('express-session');
const passport = require("passport");
const {OAuth2Client} = require('google-auth-library');
const googleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// Necessary middlewares
app.use(express.json()); //parses the body as json
app.use(express.urlencoded({extended: true}));

app.use(cors());
// app.use(session({
// 	secret: ,
// 	resave: ,
// 	saveUninitialized:
// }));
// app.use(passport.initialize()); // init passport on every route call
// app.use(passport.session()); // allow passport to use express-session

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
//GOOGLE STRATEGY
// use google authentication strategy
// passport.use(new googleStrategy({
//     clientID: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     callbackURL: "http://www.example.com/auth/google/callback",
// 	scope: ["profile", "email"]
//   },
//   function (accessToken, refreshToken, profile, cb) {
//     User.findOrCreate({ googleId: profile.id }, function (err, user) {
//       return cb(err, user);
//     });
//   }
// ));

// passport.serializeUser((user, done) => {
// 	return done(null, user);
// })

// passport.deserializeUser((user, done) => {
// 	return done(null, user);
// })


//LOCAL STRATEGY
// // use local strategy
// passport.use(new LocalStrategy (authUser))

// // get the authenticated user
// var authUser = (user, password, done) => {
// 	// step 1 : search the user in the DB to authenticate the user
// 	// step 2 : an authenticated user matches and returns this json of user_id and user_name
// 	let authenticated_user = {
// 		id: 123,
// 		name: "kyle"
// 	}
// 	return done(null, authenticated_user)
// 	// How the done function is called and returned for different outputs :
// 	// 	1. If the user not found in DB, 
// 	// 	done (null, false)
// 	// 	2. If the user found in DB, but password does not match, 
// 	// 	done (null, false)
// 	// 	3. If user found in DB and password match, 
// 	// 	done (null, {authenticated_user})
// }

// // serialize authenticated user
// // is the process of adding the authenticated user to the end of the req.session.passport object. 
// // allows authenticated user to be "attached" to a unique session => helps maintain authenticated users for
// // each session within "req.session.passport.user.{..}"

// passport.serializeUser( (userObj, done) => {
//     done(null, userObj)
// })

// // de-serialize authenticated user
// // now anytime we want the user details for a session, we can simply get the object that is stored in "req.session.passport.user.{..}"
// // either perform additional search in DB or just use the available info 

// passport.deserializeUser((userObj, done) => {
// 	done (null, userObj )
// })

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// Middlewares

//GOOGLE STRATEGY
app.get('/login', async (req, res, next) => {res.send("hi")})
app.post('/login', async (req, res, next) => {
	console.log("incoming request at /login ...");
	// REQ BODY FORMAT; ID token
	// {credential: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjJkOWE1ZWY1YjEyNjIzYz…RZhkGBgzUMy7qPhl13S8Y0jq3LpmcFETiLELcoi7taYoCl5uA', clientId: '930971578233-co8ptnobgutss87mpjptnjcsdj4a1l1q.apps.googleusercontent.com', select_by: 'btn'}
	// clientId : "930971578233-co8ptnobgutss87mpjptnjcsdj4a1l1q.apps.googleusercontent.com"
	// credential : "eyJhbGciOiJSUzI1NiIsImtpZCI6IjJkOWE1ZWY1YjEyNjIzYzkxNjcxYTcwOTNjYjMyMzMzM2NkMDdkMDkiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYmYiOjE2ODQ5MDE3NDcsImF1ZCI6IjkzMDk3MTU3ODIzMy1jbzhwdG5vYmd1dHNzODdtcGpwdG5qY3NkajRhMWwxcS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsInN1YiI6IjExMzE1Mzk2OTIyMDk4ODEzNTA3NSIsImhkIjoicG9pbnQtc3Rhci5jb20iLCJlbWFpbCI6ImpvZS5jaHVhQHBvaW50LXN0YXIuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImF6cCI6IjkzMDk3MTU3ODIzMy1jbzhwdG5vYmd1dHNzODdtcGpwdG5qY3NkajRhMWwxcS5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsIm5hbWUiOiJKb2UgQ2h1YSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQWNIVHRmTER1dDBvcDJPUHNCaW12ZXF3akRmYWRqRmNxZS1xMkp6Tk9lWT1zOTYtYyIsImdpdmVuX25hbWUiOiJKb2UiLCJmYW1pbHlfbmFtZSI6IkNodWEiLCJpYXQiOjE2ODQ5MDIwNDcsImV4cCI6MTY4NDkwNTY0NywianRpIjoiZTgyMDI3ZmFlMDBhZjNkYzZiNWExMzk0Mzg5NTQ2YWE0NzM2MjBmMyJ9.vm6v4v6adeqnl_XEqVPV17fh2yaaYe78-AqcmiF_dDF3oTahbcJ_iufK92qO_ZjFBjpgFX6Qm2T7t5KLobQrGL4KqwC-iXhbB714-jcNRYtMD33pkWC-2SEfAcnO0suAwGLE_XgTW5rrSOv9niMt1BLoTLTufJrgS5qsWtp0afrfkBc6eEQVMzLMAuJKHODjG93ieF2UIjSVea2qaoI3o0xSo3fF8x_k8GdcF9L8SMxcqGbASA_o2herqoWGIHyPXmQ42bOAijV0HcXylQsq_5s1wBy-SOwZfnl95RZhkGBgzUMy7qPhl13S8Y0jq3LpmcFETiLELcoi7taYoCl5uA"
	// select_by : "btn"
	// [[Prototype]] : Object}
	try {
		//token ID is used for verification on the backend thus making sure that the front end is not some random dude
		// JWT VERIFICATION using googls npm package
		const {credential, clientId, select_by} = req.body;
		const client = new OAuth2Client(clientId);
		async function verify() {
			const ticket = await client.verifyIdToken({
				idToken: credential, // the token is the credential
				audience: clientId
				// Specify the CLIENT_ID of the app that accesses the backend
				// Or, if multiple clients access the backend:
				//[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
			});
			const payload = ticket.getPayload();
			const userid = payload['sub'];
			console.log(payload);
			console.log(userid);
			// If request specified a G Suite domain:
			// const domain = payload['hd'];
		}
		var result = verify().catch(console.error);
		console.log(result);

		//get user info using the access token
		// var {data} = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${req.body.access_token}`);
		// console.log(data)
		// //get token info using access token
		// var {data} = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${req.body.access_token}`);
		// console.log(data)
		
		//RETURNING DATA FORMAT; user info
		// {"id": "102592121061571384",
		// "email": "someemail@gmail.com",
		// "verified_email": true,
		// "name": "John Doe",
		// "given_name": "John",
		// "family_name": "Doe",
		// "picture": "https://lh3.googleusercontent.com/a/ALm5wu32meinHR2EEwUYP1qnwbfH8N2cfy_qHm-=s96-c",
		// "locale": "en-GB"}

		res.send("login successful");
	} catch (e) {
		console.log(e);
		res.send("error: " + e);
	}
});

// app.get('/auth/google',
//   passport.authenticate('google', { scope: ['profile'] })
// );


// app.get('/auth/google/callback', 
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   function(req, res) {
//     // Successful authentication, redirect home.
//     res.redirect('/');
// });

// router.get("/google/callback", passport.authenticate("google", {
// 	successRedirect: process.env.CLIENT_URL,
// 	failureRedirect: "login/failed"
// }))

// router.get("/google/failed", (req, res) => {
// 	res.status(401).json({
// 		error: true,
// 		message: "log in failed"
// 	})
// })

//LOCAL STRATEGY
// app.post ("/login", passport.authenticate('local', {
// 	successRedirect: "/dashboard",
// 	failureRedirect: "/login",
//  }))

//  checkAuthenticated = (req, res, next) => {
// 	if (req.isAuthenticated()) { return next() }
// 	res.redirect("/login")
//   }
  
//   app.get("/dashboard", checkAuthenticated, (req, res) => {
// 	res.render("dashboard.ejs", {name: req.user.name})
//   })

//   checkLoggedIn = (req, res, next) => {
// 	if (req.isAuthenticated()) { 
// 		 return res.redirect("/dashboard")
// 	 }
// 	next()
//   }

//   app.get("/login", checkLoggedIn, (req, res) => {     
// 	res.render("login.ejs")
// })

// app.delete("/logout", (req,res) => {
// 	req.logOut() //clears both the "req.session.passport" & "req.user"
// 	res.redirect("/login")
// 	console.log(`-------> User Logged out`)
//  })

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// DRAFT 1 : WAS TRYING TO FIGURE OUT HOW TO AUTHENTICATE, AUTHORISE AND CREATE USER SESSIONS IN THIS DRAFT. CURRENTLY NOW I HAVE SUCCESSFULLY 
// SENT THE ID TOKEN FROM CLIENT SIDE TO SERVER SIDE AND WAS ABLE TO VERIFY THE ID TOKEN USING THE OAUTH2CLIENT NPM. THIS RESULTS IN AN EMAIL THAT I CAN COMPARE TO IN MY DATABASE.
// NOW I NEED TO FIGURE OUT HOW TO ENSURE THAT EVERY SINGLE REQUEST WAS THRU A VERIFIED USER (SMT LIKE MAINTAINING A USER SESSION)
// HOW DO I TELL MY CLIENT, YES IM LOGGED IN ALREADY BUT IN A SAFE MANNER?
// NEED TO IMPLEMENT THE REGISTRATION PART AS WELL

// *THIS DRAFT WORKS WITHOUT ANY FOLDER INTEGRATION
// *ALOT OF UNNECCESSARY CODE HERE NOT IN USE