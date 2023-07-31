require("dotenv").config();
const auth = require("./routes/auth");
const actions = require("./routes/actions");
const axios = require('axios');
const express = require('express');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();

// Necessary middlewares
app.use(express.json()); //parses the body as json
app.use(express.urlencoded({extended: true}));
app.use(cookieParser()); // allows eassy acces to see the cookies in req.cookies, and setting cookies in res.cookies
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'] // the allowed origins 
app.use(cors({ // this is for cross domain sharing of resources
	origin: allowedOrigins,
	credentials: true // this allows cookies to be sent over
}));

// Different routes
app.use('/auth', auth);
app.use('/actions', actions);

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
//on the server at kPort
const kPort = process.env.PORT || 8080;
app.listen(kPort)
console.log(`app is listening on port ${kPort}`)

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------ 
// DRAFT 3 : THIS DRAFT IS THE BEGINNING OF DESIGNATION OF DIFFERENT ROUTES. 
// HAVE CREATED ROUTES FOLDER, AUTH.JS AND ACTIONS.JS, THE MAIN CHANGES ARE IN AUTH.JS CAN GO SEE WHAT HAS BEEN DONE