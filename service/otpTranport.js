const nodemailer = require("nodemailer");

exports.transport = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user:"riyur017@gmail.com",
        pass: "umxaxhxfoemodrqe"
    }
});
