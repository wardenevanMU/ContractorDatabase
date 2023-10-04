if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const app = express();
const port = 3000;

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

app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name, email: req.user.email, password: req.user.password });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

// 1. Access the CSS and JS files in the public folder
app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/CSS'));
app.use('/js', express.static(__dirname + 'public/JS'));
app.use('/txt', express.static(__dirname + 'public/JS'));

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs');
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    var name = req.body.name;
    var email = req.body.email;
    var sql = `INSERT INTO customer (name, email) VALUES ("${name}", "${email}")`;
    db.query(sql, function (err, res) {
      if (err) throw err;
      console.log('Row has been updated');
      req.flash('success', 'Data stored!');
    });

    const hashedPassword = await bcrypt.hash(req.body.password, 10); // Use a salt factor (e.g., 10)
    usrs.push({
      id: Date.now().toString(),
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword
    });

    res.redirect('/login');
  } catch {
    res.redirect('/register');
  }
});

app.post('/register', function (req, res, next) {
  var name = req.body.name;
  var email = req.body.email;
  var sql = `INSERT INTO customer (name, email) VALUES ("${name}", "${email}")`;
  db.query(sql, function (err, res) {
    if (err) throw err;
    console.log('Row has been updated');
    req.flash('success', 'Data stored!');
    res.redirect('/login');
  });
});

app.delete('/logout', (req, res) => {
  req.logout(function(err) {
    if(err){
      return next(err);
    }
  });

  res.redirect('/login');
});

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

app.get('/', function(req, res){
  con.query('select * from customer', (err, rows) => {
    if(err) throw console.error("error");

    if(!err){
      console.log(rows.length);
      res.render('index.ejs', {rows});
    }
  });
});

module.exports = app;



