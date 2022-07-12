
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
// console.log(process.env.SECRET)

const express = require('express')
const path = require('path')
const mongoose = require('mongoose')
const methodOverride = require('method-override')
const engine = require('ejs-mate')
const ExpressError = require('./utilities/ExpressError')
const app = express();
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport')
const LocalStrategy = require('passport-local')
const User = require('./models/user')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')

const MongoDBStore = require('connect-mongo')


//mongo atlas

//const dbUrl = process.env.DB_URL
const dbUrl = process.env.DB_URL || "mongodb://localhost:27017/yelp-camp";
// const dbUrl = 'mongodb://localhost:27017/yelp-camp'


//routes
const campgroundRoutes = require('./routes/campgrounds');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users')


mongoose.connect(dbUrl)


// mongoose.connect(dbUrl);


const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error :("))
db.once("open", () => {
    console.log("Database Connected")
})



app.engine('ejs', engine)
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')));
app.use(mongoSanitize())



const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net/",
    "https://res.cloudinary.com/dv5vm4sqh/"
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://stackpath.bootstrapcdn.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net/",
    "https://res.cloudinary.com/dv5vm4sqh/"
];
const connectSrcUrls = [
    "https://*.tiles.mapbox.com",
    "https://api.mapbox.com",
    "https://events.mapbox.com",
    "https://res.cloudinary.com/dv5vm4sqh/"
];
const fontSrcUrls = ["https://res.cloudinary.com/dv5vm4sqh/"];

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dhdqnxlor/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT!
                "https://images.unsplash.com/"
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
            mediaSrc: ["https://res.cloudinary.com/dv5vm4sqh/"],
            childSrc: ["blob:"]
        }
    })
);

const secret = process.nextTick.SECRET || 'thisshouldbeabettersecret!'

const store = new MongoDBStore({
    mongoUrl: dbUrl,
    secret: secret,
    touchAfter: 24 * 60 * 60
});

store.on('error', function(e){
    console.log('SESSION STORE ERROR',e)
})

//session middleware
app.use(session({
    store,
    name: 'yelpSessId',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    //must be set to true!!!
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        //sets expiration date as a week from current date
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        // secure: true
        //for just extra security to avoid cross site scripting
    }
}));


//passport middlewares
app.use(passport.initialize())
app.use(passport.session())
//These above middlewares are required for persistant login for a user so that he does not need to login each time he visits a web page with authentication
//The passport.session() must be used only after the express session package middleware has been set up
passport.use(new LocalStrategy(User.authenticate()))
//we are telling passport to use the Local Strategy that we have installed on the User model using a method authenticate()
//But we did not define any methods to the User model
//This authenticate() is one of the methods provided to the model by the Local Strategy

passport.serializeUser(User.serializeUser())
//This is to tell passport how to store data of a user in a session
passport.deserializeUser(User.deserializeUser())
//To tell passport how to unstore or remove a user from the session

app.use(flash());

app.use((req, res, next) => {
    // console.log(req.session)
    res.locals.currentUser = req.user
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
})
//Note that currentUser can be set only after the passport middleware is run!!!!!!!




//route middlewares
app.use('/campgrounds', campgroundRoutes);
app.use('/campgrounds/:id/reviews', reviewRoutes);
app.use('/', userRoutes)

app.get('/', (req, res) => {
    res.render('home')
})


// // Creating a user
// app.get('/fakeUser', async (req, res) => {
//     const user = new User({
//         email: 'alex@gmail.com',
//         username: 'Alex123',
//     })
//     //we dont set the password field
//     //we do that using the register() method provided by passport module
//     const newUser = await User.register(user, 'qwerty')
//     //This register() takes an instance of the model and the password as the parameters and hashes the password and also checks if username is unique
//     res.send(newUser)
//     //So this newUser will have the email,username,salt and the hash
//     //we did not set any of these using bcrypt
//     //passport does all this in the background and just gives us the required hash and salts
// })



app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { status = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something went wrong!'
    res.status(status).render('error', { err })
})


const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`serving on port ${port}`)
})