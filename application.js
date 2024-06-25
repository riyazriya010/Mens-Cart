const express = require('express');
const session = require('express-session');
const nocache = require('nocache');
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const userRouter = require("./routes/userRoute.js");
const adminRouter = require("./routes/adminRoute.js");
const { connectingDB } = require('./config/connectDB.js');
require('dotenv').config();
require('./middleware/googleAuth2.js');

const AppError = require('./middleware/errorHandling.js');

const PORT = process.env.PORT || 3006;

const app = express();

//connectingDb
connectingDB();

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended:true }));


//method override middleware setup
app.use(methodOverride('_method'));

// Session middleware setup
const session_secret = process.env.SESSION_SECRET;
app.use(session({
    secret:session_secret,
    resave:false,
    saveUninitialized:true,
    cookie : { secure:false }  // false because we using http
}));


// Disable client-side caching
app.use(nocache());


//settingUp view Engine
app.set("view engine","ejs");


//serving the static files
app.use(express.static("public"));


//routes
app.use(userRouter);
app.use(adminRouter);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging purposes

  if (err instanceof AppError) {
      res.status(err.statusCode).render('500', { error: err.message }); // Render 500 page for AppError
  } else {
      res.status(500).render('500', { error: 'An unexpected error occurred' }); // Render 500 page for any other errors
  }
});


//404 error for unknown routes
app.use("/*", (req,res) => {
    res.render("404");
});


//listenign to the port
app.listen(PORT, (error) => {
    if(error) throw error;
    console.log(`Server is  running on PORT ${PORT}`);
});