const express = require('express');
const adminRouter = express.Router();
const adminController = require("../controller/adminController.js");
const { adminLogged, adminAuthenticate } = require("../middleware/adminLog.js");
const productController = require("../controller/productController.js");
const categoryController = require("../controller/categoryController.js");
const upload = require('../service/multer.js');
const orderManagement = require('../controller/orderManagement.js');
const shopController = require('../controller/shopController.js');
const userController = require('../controller/userController.js');
const couponController = require('../controller/couponManagement.js');
const salesReportController = require('../controller/salesReportController.js');


//common adminAuth
adminRouter.use(adminLogged);

//admin
adminRouter.get('/adminLogin',adminController.adminLoginGet);
adminRouter.post('/adminLoginVerify',adminController.adminLoginVerify);
adminRouter.get('/adminLogout',adminController.adminLogout);


//admin Dashboard
adminRouter.get('/dashboard',adminAuthenticate,adminController.dashBoard);
adminRouter.get('/admin/dashBoard/data',adminController.getData);
adminRouter.get('/admin/dashBoard/topProducts',adminAuthenticate,adminController.topProducts);
adminRouter.get('/admin/dashBoard/topCategory',adminAuthenticate,adminController.topCategory);


//product Page
adminRouter.get('/admin/product',adminAuthenticate,productController.productGet);
adminRouter.get('/admin/addProduct',productController.addProductGet);
adminRouter.post('/admin/addProduct/verify',upload.array('images',10),productController.addProduct);
adminRouter.get('/admin/editProduct/:id', productController.renderEditProductPage);
adminRouter.put('/admin/editProductVerify/:id', upload.array('images', 10), productController.editProduct);
adminRouter.get('/product/search',productController.productSearch);
adminRouter.put('/admin/product/unList',productController.unList);
adminRouter.put('/admin/product/list',productController.List);
adminRouter.delete('/admin/product/delete/:id',productController.deleteProduct);
adminRouter.patch('/admin/productImage/delete', productController.deleteImage);


//Product Offer Management
adminRouter.get('/admin/productOffer',adminAuthenticate,productController.productOfferManagement);
adminRouter.post('/admin/productOfferManagement/addOffer',productController.addProductOffer);
adminRouter.put('/admin/productOfferManagement/editOffer',productController.editProductOffer);


//category Page
adminRouter.get('/category',adminAuthenticate,categoryController.categoryGet);
adminRouter.post('/categoryAdd',categoryController.categoryAdd);
adminRouter.put('/category/edit/:id',categoryController.categoryEdit);
adminRouter.get('/category/search', categoryController.categorySearch);
adminRouter.put('/admin/category/unList',categoryController.unList);
adminRouter.put('/admin/category/list',categoryController.List);
adminRouter.delete('/category/delete/:id', categoryController.categoryDelete);


//Category Offer Management
adminRouter.get('/admin/categoryOffer',adminAuthenticate,categoryController.categoryOfferManagement);
adminRouter.post('/admin/categoryOfferManagement/addOffer',categoryController.addCategoryOffer);
adminRouter.put('/admin/categoryOfferManagement/editOffer',categoryController.editOffer);



//user Page 
adminRouter.get('/admin/user',adminAuthenticate,userController.userGet);
adminRouter.put('/admin/userManagement/blockUser',userController.userBlock);
adminRouter.put('/admin/userManagement/unBlockUser',userController.userUnBlock);
adminRouter.get('/user/search', userController.userSearch);


//ratings
adminRouter.get('/admin/ratings',adminAuthenticate,shopController.rating);


//order Management
adminRouter.get('/admin/orderManagement',adminAuthenticate,orderManagement.orderListing);
adminRouter.get('/admin/singleOrder/:id',adminAuthenticate,orderManagement.adminOrderDetails);
adminRouter.put('/admin/orderStatus/change',orderManagement.statusChange);

//order Return Management
adminRouter.get('/admin/returnManagement',adminAuthenticate,orderManagement.returnManagement);
adminRouter.put('/admin/returnManage/options',orderManagement.returnApprovedOrReject);

//coupon Management
adminRouter.get('/admin/couponManagement',adminAuthenticate,couponController.couponGet);
adminRouter.post('/admin/couponOfferManagement/addCoupon',couponController.addCoupon);
adminRouter.put('/admin/couponManagement/editCoupon',couponController.editCoupon);
adminRouter.post('/admin/coupon/delete',couponController.deleteCoupon);
adminRouter.post('/admin/coupon/restore',couponController.restoreCoupon);


adminRouter.get('/admin/report',adminAuthenticate,salesReportController.report);
adminRouter.get("/salesReport/download/pdf", salesReportController.SaledReportDownloadPDF);
adminRouter.get("/salesReport/download/xlsx",salesReportController.salesReportDownload);
adminRouter.post("/filterdate",salesReportController.filterDate);
adminRouter.post("/admin/salesReport/filterOptions",salesReportController.filterOptions);
adminRouter.get("/removefilter",salesReportController.removeAllFillters);


module.exports = adminRouter;
