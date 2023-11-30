if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = 3000;
const moment = require('moment');

//Will need to change the password in order to connect to the database
const uri = 'mongodb+srv://<yourusername>:<yourpassword>@capstonecluster.ddjdvfl.mongodb.net/?retryWrites=true&w=majority';

const contractorSchema = new mongoose.Schema({
  id: String,
  name: String,
  company: String,
  items: String,
  location: String,
  start_time: String,
  end_time: String,
  date: String,
  agent_email: String
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
  clientID: 'yourclientID',
  issuerBaseURL: 'yourbaseurl'
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

app.get('/callback', (req, res) => {
  // Check if there was an error in the authentication flow
  if (req.query.error === 'BadRequestError') {
    // Render the custom error page with an access denied message
    res.render('accessDenied.ejs');
  } else {
    res.render('login.ejs');
  }
});



app.post('/search', async (req, res) => {
  const searchQuery = req.body.searchQuery;
  const agentEmail = req.oidc.user.email;

  try {
    const data = await Contractor.find({
      agent_email: agentEmail,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { company: { $regex: searchQuery, $options: 'i' } },
        { date: { $regex: searchQuery, $options: 'i' } }
      ]
    }).sort({date: 'desc'});

    // Render the "search" EJS template with the search results and search query
    res.render('search.ejs', { data: data, searchQuery: searchQuery });
  } catch (error) {
    console.error('Error searching data from MongoDB: ', error);
    res.status(500).send('Internal Server Error');
  }
});






async function generateNewID() {
  const count = await Contractor.countDocuments();
  return count + 1;
}

app.post('/add', async (req, res) => {
  const newData = req.body;
  newData.id = await generateNewID();
  newData.agent_email = req.oidc.user.email;

  // Format the date as "MM-DD-YYYY" before saving it
  newData.date = moment(newData.date).format('MM-DD-YYYY');

  try {
    const result = await Contractor.create(newData);

    // Render the success page with the newly added data
    res.render('success.ejs', { newData: newData });
  } catch (error) {
    console.error('Error adding data to MongoDB: ', error);

    // Set an error flash message
    req.flash('error', 'Error adding contractor to the database.');

    res.status(500).send('Internal Server Error');
  }
});

//Checks if the user is authenticated before redirecting to edit page
function checkAuthenticatedForEdit(req, res, next) {
  if (req.oidc.isAuthenticated()) {
    return next();
  }

  // User will be forced to sign in
  res.redirect('/login');
}

app.get('/edit/:id', checkAuthenticatedForEdit, async (req, res) => {
  const contractorId = req.params.id;

  try {
    const contractor = await Contractor.findOne({ id: contractorId });

    if (!contractor) {
      // Contractor not found, handle this case (e.g., display an error message)
      res.status(404).send('Contractor not found');
    } else {
      res.render('edit.ejs', { contractor: contractor });
    }
  } catch (error) {
    console.error('Error fetching contractor data: ', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/edit/:id', async (req, res) => {
  const contractorId = req.params.id;
  const updatedData = req.body; // Data submitted from the edit form

  // Convert the date from "YYYY-MM-DD" to "MM-DD-YYYY" format
  updatedData.date = moment(updatedData.date).format('MM-DD-YYYY');

  try {
      await Contractor.updateOne({ id: contractorId }, updatedData);

      // Render the success page after updating the data and pass updatedData to the template
      res.render('editSuccess.ejs', { updatedData: updatedData });
  } catch (error) {
      console.error('Error updating contractor data: ', error);
      res.status(500).send('Internal Server Error');
  }
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
const { Int32 } = require('mongodb');

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