const LocalStrategy = require('passport-local').Strategy;
function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = getUserByEmail(email)
        if (user == null) {
            return done(null, false, { message: 'There is no user with that email.' })
        }

        // Replace bcrypt password comparison logic with an alternative method
        if (password === user.password) {
            return done(null, user)
        } else {
            return done(null, false, { message: 'This is not the correct password' })
        }
    }

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    })
}

module.exports = initialize
