const userCollection = require('../models/userModel.js');

exports.generateReferalCode = () => {
    const characters = '0123456789';
    let referralCode = '';
    for (let i = 0; i < 6; i++) { // Generate an 8-character long random string
        referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return referralCode;
  }


  
  exports.signupReferal = async (req) => {
    try {

        const code = req

        // console.log(typeof code);

        const userData = await userCollection.user.findOne({referralCode:code})

        if(!userData){
          return false
        }

        // console.log(userData)

        return userData

    } catch (error) {
        console.log(error.message);
    }
  }