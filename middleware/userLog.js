const userCollection = require('../models/userModel');


exports.isLogged = async (req, res, next) => {

    try{

    if (req.session.userId) {
        const user = await userCollection.user.findById(req.session.userId);

        if (user && user.isLogged && !user.isBlocked) {
            req.session.logged = true;
            res.locals.name = user.username;
            res.locals.logged = true;
        } else {
            req.session.logged = false;
            res.locals.name = null;
            res.locals.logged = false;
        }
    } else {
        req.session.logged = false;
        res.locals.name = null;
        res.locals.logged = false;
    }
    next();
    

  }catch(error){
    console.error(error.message);
  }

};



exports.redirectIfLoggedIn = (req, res, next) => {
    if (req.session.logged) {
        return res.redirect('/');
    }
    next();
};



exports.redirectNotLoggedIn = (req,res,next) => {
    if(!req.session.logged) {
        return res.redirect('/login')
    }
    next();
}