exports.generateCouponCode = () => {
    const characters = 'MENSCART0123456789';
    let couponCode = '';
    for (let i = 0; i < 8; i++) { // Generate an 8-character long random string
      couponCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return couponCode;
  }