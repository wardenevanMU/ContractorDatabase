var db = require('./mydatabase')



if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const express = require('express')
const app = express()
const port = 3000

const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')

const usrs = []


//Creates and authenticates password
const createPassport = require('./passportConfig')//because it is exported as initalized
createPassport(
  passport,
  email => usrs.find(user => user.email === email),
  id => usrs.find(user => user.id === id)
)

app.set('view-engine', 'ejs') // looks for the ejs file in the view folder
app.use(express.urlencoded({ extended: false }))

app.use(flash())

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

//calls the function from the passportConfig.js
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

//used to check the name with is visible to the user
app.get('/', checkAuthenticated, (req, res) => {
  res.render('index.ejs', { name: req.user.name, email: req.user.email, password:req.user.password })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs')
})

//1. access the css and js files in the public folder
app.use(express.static('public'))
app.use('/css', express.static(__dirname + 'public/CSS'))
app.use('/js', express.static(__dirname + 'public/JS'))
app.use('/txt', express.static(__dirname + 'public/JS'))

//uses post to login and send to the index.js
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

//renders out the register.ejs if not authenticated
app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    var name = req.body.name
    var email = req.body.email
    var sql = `INSERT INTO customer (name, email) VALUES ("${name}", "${email}")`
    db.query(sql, function (err, res) {
      if (err) throw err
      console.log('Row has been updated')
      req.flash('success', 'Data stored!')
      
    })
      const hashedPassword = await bcrypt.hash(req.body.password, 8)
      usrs.push({
          id: Date.now().toString(),
          name: req.body.name,
          email: req.body.email,
          password: hashedPassword
      })
      
      res.redirect('/login')
  } catch {
      res.redirect('/register')
  }
  
  

})


app.post('/register', function (req, res, next) {
  var name = req.body.name
  var email = req.body.email
  var sql = `INSERT INTO customer (name, email) VALUES ("${name}", "${email}")`
  db.query(sql, function (err, res) {
    if (err) throw err
    console.log('Row has been updated')
    req.flash('success', 'Data stored!')
    res.redirect('/login')
  })})
  

//log usr out
app.delete('/logout', (req, res) => {
  req.logout(function(err) {
    if(err){
      return next(err)
    }
  })

  res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next()
  }

  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return res.redirect('/')
  }

  next()
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

  


app.get('/', function(req, res){
  con.query('select * from customer', (err, rows) => {
      if(err) throw console.error("error");
      
          if(!err){
          console.log(rows.length)
          res.render('index.ejs', {rows})
      }
  })
})

module.exports = app


// word_count = 0
// char_count = 0
// space_count = 0


// app.get('/', checkNotAuthenticated, (req, res) => {
//     res.render('index.ejs', {wCount: word_count, cCount: char_count, sCount: space_count})
// })

// app.post("/index", (req, res) => {
//     const user_input = req.body.textBox;

//         // parse input and generate word_count, char_count, space_count
//         // save them as global variables

//     res.redirect("/")
//     })





