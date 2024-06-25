const userCollection = require("../models/userModel.js");
const bcrypt = require("bcrypt");
const { sendOtp, generateOtp } = require("../helper/otp.js");
const otpCollection = require("../models/otpModel.js");
const { generateReferalCode, signupReferal } = require('../helper/referral.js');
const { addReferalMoney, newUserAddMoney , walletCreation } = require('../controller/accountControlller.js');
const productCollection = require('../models/productModel.js');
const AppError = require('../middleware/errorHandling.js');



//landing Page
exports.landingPage =  async (req,res) => {

    const products = await productCollection.product.find().sort({ _id: -1 }).limit(4)

    res.render("userPages/landingPage",{ name:res.locals.name, products });
}


// Login Get
exports.loginGet = (req, res) => {

    res.render("userPages/loginPage", { name: res.locals.name });
};



//login Verify
exports.loginVerify = async (req,res,next) => {
    try {

        const loginData = {
            email:req.body.email,
            password:req.body.password
        }

        const findUser = await userCollection.user.findOne({
            email:loginData.email
        });

        if (findUser && await bcrypt.compare(loginData.password, findUser.password)) {

            if(findUser.isBlocked) {
                
                return res.json({ blocked: true });
            }

             // Find the user and update isLogged to true
             await userCollection.user.updateOne(
                { email: findUser.email },
                { $set: { isLogged: true } }
            );

            req.session.userId = findUser._id;
            
            // req.session.loginVerify = true;

            res.json({ success: true });

        }else{

            res.json({ success: false });
        }

    } catch (error) {
        next(new AppError(error.message, 500))      
    }
}


// Signup Get
exports.signupGet = (req, res) => {
    res.render("userPages/signupPage", { name: res.locals.name });
};



//signupVerify
exports.signupVerify = async (req,res,next) => {
    try{

        if(req.body.referalCode){

        const refCode = await signupReferal(req.body.referalCode);

        if(!refCode){
            return res.json({ codeNotValid:true });
        }

        req.session.refUserData = refCode
        
    }
       
        const saltRounds = 10;  // Typically a value between 10 and 12
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const referralCode = generateReferalCode();
        const userData = {
            username:req.body.username,
            email:req.body.email,
            phone:req.body.phone,
            password:hashedPassword,
            referralCode:referralCode,
        }

        const userExist = await userCollection.user.findOne({
            $or:[
                {email:userData.email},
                {phone:userData.phone}
            ]
        })

        if(userExist){

           return res.json({ exists: true });
        }

        const otp = generateOtp();

        const expireAt = new Date(Date.now() + 61000); // 60 seconds expiry

        //hasing otp
        const hashedOtp = await bcrypt.hash(otp,10)

        //creating collection for otp
        const otpDocument = new otpCollection.otp({
            email:userData.email,
            otp:hashedOtp,
            generatedAt:new Date().toISOString(),
            expireAt:expireAt
        });

        //saving otp to db
        await otpDocument.save();

        //invoking send otp function
        sendOtp(userData.email, otp)
        

            req.session.userDetails = userData;
            req.session.otpDetails = otpDocument;

            const deleteOtpCollection = async () => {
                try {
                  await otpCollection.otp.deleteMany({});
                  console.log('OTP collection deleted');
                } catch (err) {
                  console.error('Error deleting OTP collection:', err);
                }
              };
              
              // Schedule the function to be executed after 1 minute
              setTimeout(deleteOtpCollection, 60000);

            res.json({ exists: false });
            
    }catch(error){
        next(new AppError(error.message, 500))
    }
}




exports.logout = async (req, res) => {
    if (req.session.userId) {
        await userCollection.user.updateOne(
            { _id: req.session.userId },
            { $set: { isLogged: false } }
        );
    }
    req.session.destroy((error) => {
        if (error) {
            console.error('Error destroying session:', error);
            return res.status(500).render('500');
        }
        res.redirect('/login');
    });
};




//otp  Page
exports.optGet = (req,res) => {

        res.render("userPages/otpPage"); 
}




//otpVerify
exports.otpVerify = async (req,res,next) => {
    try {
        
        const { otp } = req.body;
        // const storedOtp = req.session.otpDetails.otp;
        const otpData = await otpCollection.otp.findOne({email:req.session.userDetails.email});

        if (!otpData) {
            return res.json({ expired:true })
        }

        if(otpData.otp === null){
            return res.json({ expired:true })
        }

        const isMatch = await bcrypt.compare(otp, otpData.otp);

        if(isMatch){

            if (req.session.refUserData) {
                req.session.userDetails = Object.assign(req.session.userDetails, {
                    referralUserId: req.session.refUserData._id
                });

                const oldUser = req.session.refUserData._id
                await addReferalMoney(oldUser);

              }

              const userDetails = req.session.userDetails;
            

             //storing user
             const newUser = new userCollection.user(userDetails);
             await newUser.save();


               // Find the user and update isVerified to true
            await userCollection.user.updateOne(
                { email: userDetails.email },
                { $set: { isVerified: true } }
            );

            await walletCreation(newUser._id);

            if(req.session.refUserData){
            await newUserAddMoney(newUser._id);
            }


            res.json({ verified: true });
        }else{

            res.json({ verified: false });

        }

    } catch (error) {
        next(new AppError(error.message, 500))
  }
}




//resend Otp
exports.resendOtp = async (req,res,next) => {
    try{

        const otp = generateOtp()

        const hashedOtp = await bcrypt.hash(otp,10)
        const userData = req.session.userDetails
        const expireAt = new Date(Date.now() + 61000); // 60 seconds expiry
       
        // Update the OTP document in the database
        const otpDocument = new otpCollection.otp({
            email:userData.email,
            otp:hashedOtp,
            generatedAt:new Date().toISOString(),
            expireAt:expireAt
        });

        //saving otp to db
        await otpDocument.save();


        //invoking send otp function
        sendOtp(userData.email, otp)

        const deleteOtpCollection = async () => {
            try {
              await otpCollection.otp.deleteMany({});
            //   console.log('Resend OTP collection deleted');
            } catch (err) {
              console.error('Error deleting OTP collection:', err);
            }
          };

          // Schedule the function to be executed after 1 minute
          setTimeout(deleteOtpCollection, 60000);

            res.json({ resend: true });

    }catch(error) {
        next(new AppError(error.message, 500))
    }
}





// Endpoint to get remaining time
exports.getRemainingTime = async (req, res, next) => {
    try {
        const otpData = await otpCollection.otp.findOne({ email: req.session.userDetails.email });

        if (!otpData || !otpData.expireAt) {
            return res.json({ remainingTime: 0 });
        }

        const remainingTime = Math.max(otpData.expireAt - Date.now(), 0);
        res.json({ remainingTime: Math.ceil(remainingTime / 1000) }); // return in seconds, rounded up to avoid showing fractions
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



//google callback
exports.googleCallback = async (req,res,next) => {
    try{

        //Add the  user name to the database
        const user = await userCollection.user.findOneAndUpdate(
            {email:req.user.email},
            { $set: { username: req.user.displayName,isVerified:true, isLogged: true } },
            { upsert:true,new :true }
        )

        //log user true
        // req.session.name = user.username;

        // req.session.loginVerify = true
        req.session.userId = user._id;
        res.redirect('/');

    } catch(error) {
        next(new AppError(error.message, 500))
    }
}




                    /*----- forget password -----*/


                    

//email Get
exports.emailGet = (req, res) => {
    res.render('userPages/emailVerify');
}


//email Verify
exports.emailVerify = async (req, res, next) => {

    try {

        const userData = await userCollection.user.findOne({ email: req.body.email })

        if (userData) {

            const otp = generateOtp();

            const hashedOtp = await bcrypt.hash(otp, 10)

            //creating collection for otp
            const otpDocument = new otpCollection.otp({
                email: userData.email,
                otp: hashedOtp,
                generatedAt: new Date().toISOString(),
                expireAt: new Date(Date.now() + 60000).toISOString() // 55 seconds from now
            });


            //saving otp to db
            await otpDocument.save();

            sendOtp(userData.email, otp);

            req.session.verifyOtp = otp;
            req.session.userData = userData;
            req.session.emailVerify = true;

            const deleteOtpCollection = async () => {
                try {
                  await otpCollection.otp.deleteMany({});
                //   console.log('OTP collection deleted');
                } catch (err) {
                  console.error('Error deleting OTP collection:', err);
                }
              };
              
              // Schedule the function to be executed after 1 minute
              setTimeout(deleteOtpCollection, 60000);

            return res.json({ NotExist: false });
        }

        res.json({ NotExist: true });

    } catch (error) {

        next(new AppError(error.message, 500))

    }
}


//oto Get
exports.otpGetForget = (req, res, next) => {
    try {

        if (req.session.emailVerify) {
            let timer = 60
            res.render('userPages/forgetVerifyOtp', { timer });
        } else {
            res.redirect('/');
        }

    } catch (error) {
        next(new AppError(error.message, 500))
    }

}



//otp Verifying
exports.forgetVerifyOtp = async (req, res, next) => {
    // console.log(req.body)
    try {

        // console.log('otps: ',req.query)

        const  otp  = req.query.otp;
        const storedOtp = req.session.verifyOtp;
        const userData = req.session.userData
        // console.log('storedOtp: ',storedOtp);
        if ( otp ===  storedOtp) {
            // console.log('matched')
            // Delete OTP collection from db
            //  await otpCollection.otp.deleteMany({ email: userData.email });

            req.session.otpVerify = true

            return res.json({ verified: true });

        } else {
            // console.log('not matched');
            res.json({ verified: false });
        }


    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



//recover password Get
exports.recoverPasswordGet = (req, res, next) => {
    try {

        if (req.session.otpVerify) {
            res.render('userPages/recoverPassword');
        } else {
            res.redirect('/');
        }

    } catch (error) {
        next(new AppError(error.message, 500))
    }

}



//recover password Verify
exports.recoverPassVerify = async (req, res, next) => {

    try {

        const { password } = req.body
        const hashedPassword = await bcrypt.hash(password, 10);
        const userData = req.session.userData

        await userCollection.user.findOneAndUpdate(
            { email: userData.email },
            { $set: { password: hashedPassword } }
        );

        res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}


exports.otpResend = async (req,res,next) => {
    try {

        const resendOtp = generateOtp();

        const userData = req.session.userData

        const hashedOtp = await bcrypt.hash(resendOtp, 10)

        //creating collection for otp
        const otpDocument = new otpCollection.otp({
            email: userData.email,
            otp: hashedOtp,
            generatedAt: new Date().toISOString(),
            expireAt: new Date(Date.now() + 60000).toISOString() // 55 seconds from now
        });


        //saving otp to db
        await otpDocument.save();

        sendOtp(userData.email, resendOtp);
        
        req.session.verifyOtp = resendOtp;


        const deleteOtpCollection = async () => {
            try {
              await otpCollection.otp.deleteMany({});
            //   console.log('OTP collection deleted');
            } catch (err) {
              console.error('Error deleting OTP collection:', err);
            }
          };
          
          // Schedule the function to be executed after 1 minute
          setTimeout(deleteOtpCollection, 60000);

          res.json({resend:true})
        
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}




/* ----- user Management admin side ---- */

exports.userGet = async (req,res,next) => {
    try {
        if(req.session.adminVerify){
    
            // const user = await userCollection.user.find()
    
            // Pagination setup
            const page = parseInt(req.query.page) || 1;
            const limit = 4; // Number of categories per page
            const skip = (page - 1) * limit;
    
            let userData;
            let totalUser;
            const searchQuery = req.query.searchQuery || null;
    
            if (searchQuery) {
                // Perform a search query in your MongoDB collection
                userData = await userCollection.user.find({
                    username: { $regex: searchQuery, $options: 'i' }
                }).skip(skip).limit(limit);
                totalUser = await userCollection.user.countDocuments({
                    username: { $regex: searchQuery, $options: 'i' }
                });
            } else {
                totalUser = await userCollection.user.countDocuments({});
                userData = await userCollection.user.find({}).skip(skip).limit(limit);
            }
    
            const totalPages = Math.ceil(totalUser / limit);
    
    
    
            res.render("adminPages/userManage", { 
                userData,
                totalUser,
                currentPage: page,
                totalPages,
                searchQuery,
             });
            
        }else{
    
            res.redirect('/adminLogin');
        }
        
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}




exports.userBlock = async (req, res, next) => {
    try {
        const userId = req.query.userId;

        const userUpdate = await userCollection.user.findByIdAndUpdate(
            userId,
            { $set: { isBlocked: true, isLogged: false } }, // Update both isBlocked and isLogged
            { new: true }
        );

        if (userUpdate) {
            // Destroy the session if the user is currently logged in
            if (req.session.userId && req.session.userId.toString() === userId) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                        return res.status(500).send({ success: false, error: 'Internal Server Error' });
                    }
                    res.send({ success: true });
                });
            } else {
                res.send({ success: true });
            }
        } else {
            res.send({ userNotExist: true });
        }

        // console.log(userUpdate);
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




exports.userUnBlock = async (req, res, next) => {
    try {
        const userId = req.query.userId;

        const userUpdate = await userCollection.user.findByIdAndUpdate(
            userId,
            { $set: { isBlocked: false } },
            { new: true }
        );

        if (userUpdate) {
            res.send({ success: true });
        } else {
            res.send({ userNotExist: true });
        }

        // console.log(userUpdate);
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



exports.userSearch = async (req, res, next) => {
    if (req.session.adminVerify) {
        try {
            // Directly call the userGet function
            await exports.userGet(req, res);
            
        } catch (error) {
            next(new AppError(error.message, 500))
        }
    } else {
        res.redirect('/adminLogin');
    }
};