const { transport } = require("../service/otpTranport.js");


//generating otp
exports.generateOtp = (req,res) => {

     // return crypto.randomBytes(3).toString('hex');
     let otp = Math.floor(Math.random() * 1000000);
    
     // Ensure the OTP is exactly 6 digits by padding with zeros if necessary
     otp = otp.toString().padStart(6, '0');
     
     return otp;
}


//Sending otp
exports.sendOtp = (email, otp) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from:"riyur017@gmail.com",
            to: email,
            subject: "Men's Cart",
            text: `Your OTP code is ${otp}`
        };

        transport.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error.message);
                reject(error);
            } else {
                console.log('Email sent:', info.response);
                resolve(info);
            }
        });
    });
};