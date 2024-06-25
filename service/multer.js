const multer = require("multer");

const path = require("node:path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/assets/uploadimages/uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

module.exports = upload;









// const multer  = require('multer');
// const path = require('node:path');

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/uploads')
//     },
//     filename: (req, file, cb) => {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() *1E9)
//         cb(null, file.fieldname + '-' +uniqueSuffix+ path.extname(file.originalname))
//     }
// });

// const upload = multer({ storage })

// module.exports = upload;