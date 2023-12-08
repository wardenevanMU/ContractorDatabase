if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const port = 3000;
const moment = require('moment');
const multer = require('multer');
const { unlink } = require('fs/promises');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if(
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/png'
  ) {
    cb(null, true);
  }else {
    cb(new Error('Only image files with the correct extension are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});


const uri = 'mongodb+srv://databaseAdminCLT:nRFWz4nyvtTbd9Bj@capstonecluster.ddjdvfl.mongodb.net/test?retryWrites=true&w=majority';

const contractorSchema = new mongoose.Schema({
  name: String,
  company: String,
  items: String,
  location: String,
  start_time: String,
  end_time: String,
  date: String,
  agent_email: String,
  image: String
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

const { auth } = require('express-openid-connect');

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',
  baseURL: 'http://localhost:3000',
  clientID: 'dDx5cVtlA2u2EF6VQl4ENiCRS5EXFA6I',
  issuerBaseURL: 'https://dev-odxp522sgzav5c5t.us.auth0.com'
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  //User will be forced to login
  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }

  next();
}


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

app.post('/add', upload.single('image'), async (req, res) => {
  try {
    const newData = {}; // Initialize newData here

    if (req.file) {
      newData.image = `/uploads/${req.file.filename}`; // Store the path to the uploaded image
    }

    Object.assign(newData, req.body); // Merge req.body properties into newData
    newData.agent_email = req.oidc.user.email;

    newData.date = moment(newData.date).format('MM-DD-YYYY');

    const result = await Contractor.create(newData);

    res.render('success.ejs', { newData: newData });
  } catch (error) {
    console.error('Error adding data to MongoDB: ', error);
    res.status(400).send(error.message || 'Error adding contractor to the database.');
  }
});



app.get('/edit/:id', checkAuthenticated, async (req, res) => {
  const contractorId = req.params.id;

  try {
    const contractor = await Contractor.findById(contractorId);

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

app.post('/edit/:id', upload.single('image'), async (req, res) => {
  const contractorId = req.params.id;

  try {
    const updatedData = req.body; // Initialize updatedData here

    // Convert the date from "YYYY-MM-DD" to "MM-DD-YYYY" format
    updatedData.date = moment(updatedData.date).format('MM-DD-YYYY');

    // Check if there's a new image uploaded
    if (req.file) {
      // If there's a new image, update the image path in the updatedData
      updatedData.image = `/uploads/${req.file.filename}`;
    }

    // Update contractor data based on _id
    await Contractor.findByIdAndUpdate(contractorId, updatedData);

    // Render the success page after updating the data and pass updatedData to the template
    res.render('editSuccess.ejs', { updatedData: updatedData });
  } catch (error) {
    console.error('Error updating contractor data: ', error);
    res.status(500).send('Internal Server Error');
  }
});



app.use(methodOverride('_method'));

//Checks if the user is authenticated before redirecting to delete page
function checkAuthenticated(req, res, next) {
  if (req.oidc.isAuthenticated()) {
    return next();
  }

  // User will be forced to sign in
  res.redirect('/login');
}
// Route for delete confirmation page
app.get('/deleteConfirmation/:id', checkAuthenticated, async (req, res) => {
  const contractorId = req.params.id;

  try {
    const contractor = await Contractor.findById(contractorId);

    if (!contractor) {
      res.status(404).send('Contractor not found');
    } else {
      res.render('deleteConfirmation.ejs', { contractor: contractor });
    }
  } catch (error) {
    console.error('Error fetching contractor data: ', error);
    res.status(500).send('Internal Server Error');
  }
});

app.delete('/delete/:id', async (req, res) => {
  const contractorId = req.params.id;

  try {
    const deletedContractor = await Contractor.findByIdAndDelete(contractorId);

    if (!deletedContractor) {
      res.status(404).send('Contractor not found');
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('Error deleting contractor data: ', error);
    res.status(500).send('Internal Server Error');
  }
});


const { requiresAuth } = require('express-openid-connect');
const { Int32, Binary } = require('mongodb');

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
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/images', express.static(__dirname + '/images'));


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;