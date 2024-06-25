exports.generateOrderId = () => {
    const characters = 'MENSCART0123456789';
    let orderId = '';
    for (let i = 0; i < 8; i++) { // Generate an 8-character long random string
      orderId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return orderId;
  }