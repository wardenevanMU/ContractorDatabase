if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose')
const port = 3000;
//Will need to change the password in order to connect to the database
const uri = 'mongodb+srv://databaseAdminCLT:<yourpassword>@capstonecluster.ddjdvfl.mongodb.net/?retryWrites=true&w=majority';

const contractorSchema = new mongoose.Schema({
  id: String,
  first_name: String,
  last_name: String,
  company: String,
  items: String,
  location: String,
  start_time: String,
  end_time: String,
  date: String,
  agent: String
});

const Contractor = mongoose.model('contractorcollection', contractorSchema);
module.exports = Contractor;
async function connect(){
  try{
    await mongoose.connect(uri)
    console.log("Connected to Database");
  }catch(error){
    console.error(error);
  }
}

connect();

const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');

const usrs = [];

// Creates and authenticates passwords
const createPassport = require('./passportConfig'); // Because it is exported as initialized
createPassport(
  passport,
  email => usrs.find(user => user.email === email),
  id => usrs.find(user => user.id === id)
);

app.set('view-engine', 'ejs'); // Looks for the ejs file in the view folder
app.use(express.urlencoded({ extended: false }));

app.use(flash());

// Use a single express-session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-fallback-secret', // Use an environment variable or a fallback secret
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));

const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',
  baseURL: 'http://localhost:3000',
  clientID: 'thisisaclientid',
  issuerBaseURL: 'thisisaurl'
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

//req.isAuthenticated is provided from the auth router
app.get('/', async (req, res) => {
  if (req.oidc.isAuthenticated()){
    try{
      const agentEmail = req.oidc.user.email; //Gives the user's email after successful login
      const data = await Contractor.find({agent_email: agentEmail});

      res.render('index.ejs', {data: data, agent_email: agentEmail});
    }catch(error){
      console.error('Error fetching data from MongoDB: ', error);
      res.status(500).send('Internal Server Error')
    }
  } else{
    res.render('login.ejs')
  };
});

app.get('/auth/duo', async (req, res) => {
  if (req.oidc.isAuthenticated()) {
    try {
      const agentEmail = req.oidc.user.email; // Get the user's email after Auth0 login

      // Check if the user is already authenticated with Duo, if not, initiate Duo MFA
      if (!userHasCompletedDuoMFA(agentEmail)) {
        // Generate a Duo state
        const state = duoClient.generateState();
  
        // Create an authentication URL for the user
        const authUrl = duoClient.createAuthUrl(agentEmail, state);
  
        // Redirect the user to the Duo authentication page
        res.redirect(authUrl);
      } else {
        // The user has already completed Duo MFA, so you can redirect them to the desired page.
        res.redirect('/dashboard');
      }
    } catch (error) {
      console.error('Error during Duo MFA initiation:', error);
      res.status(500).send('Duo MFA Error');
    }
  } else {
    // User is not authenticated with Auth0, handle this case
    res.status(401).send('Not authenticated with Auth0');
  }
});


const { requiresAuth } = require('express-openid-connect');

app.get('/profile', requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

app.get('/logout', (req, res) =>{
  req.logout();
  res.render('login.ejs')
});

app.get('/', (req, res) => {
  res.render('login.ejs');
});


// 1. Access the CSS and JS files in the public folder
app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/CSS'));
app.use('/js', express.static(__dirname + 'public/JS'));
app.use('/txt', express.static(__dirname + 'public/JS'));


function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }

  next();
}


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;