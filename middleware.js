const Campground = require('./models/campground')
const Review = require('./models/review')
const ExpressError = require('./utilities/ExpressError');
const { campgroundSchema, reviewSchema } = require('./schemas');



module.exports.validateCampground = (req, res, next) => {
    const { error } = campgroundSchema.validate(req.body);
    if (error) {
        const message = error.details.map(el => el.message).join(',')
        throw new ExpressError(message, 400)
    } else {
        next();
    }
}


module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const message = error.details.map(el => el.message).join(',')
        throw new ExpressError(message, 400)
    } else {
        next();
    }
}






module.exports.isLoggedIn = (req, res, next) => {
    // console.log('REQ USER....',req.user)
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'You must be logged in')
        return res.redirect('/login')
    }
    next()
}

//passport also gives a req.user porperty which has all info about the user if he has logged in!!!
//we want to show the links to logout in nav bar only if a user is logged in
//to do this we use the concept of res.locals to have access to a property on very request/response cycle

//return to
//when we have not logged in and go to a protected route we get a messgae saying not logged in
//But after logging in we get redirected to a differrent route
//So how to go to the intended route
//we can store a url to return to
//when a request is made req.path and req.originalUrl properties are created
//we need to store the originalUrl to the session


//Authorization middleware

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params
    const campground = await Campground.findById(id)
    if (!campground.author.equals(req.user._id)) {
        req.flash('error', 'You dont have authorization to edit this campground')
        return res.redirect(`/campgrounds/${id}`);
    }
    next()
}


module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params
    const review = await Review.findById(reviewId)
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You dont have authorization to edit this campground')
        return res.redirect(`/campgrounds/${id}`);
    }
    next()
}

