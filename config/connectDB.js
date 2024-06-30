const mongoose = require("mongoose");

exports.connectingDB = async () => {
    try{
        await mongoose.connect(process.env.CONNECT_URL);
        console.log("MongoDB Connected");

    }catch(error){
        console.error(error.message);
        process.exit(1);  //disconnects the connection while error comes
    }
}