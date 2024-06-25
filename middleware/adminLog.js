
// exports.adminLogged = (req,res,next) => {
//     res.locals.adminLogged = req.session.adminVerify || false
//     next();
// }


exports.adminLogged = (req, res, next) => {
    res.locals.adminLogged = req.session.adminVerify || false;
    next();
};

exports.adminAuthenticate = (req, res, next) => {
    if (req.session.adminVerify) {
        next();
    } else {
        res.redirect('/adminLogin'); // Redirect to login if not authenticated
    }
};