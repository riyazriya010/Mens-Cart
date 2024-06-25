   
     //Image zoom single product

     const bigCard = document.getElementById('big-card');
     const magnifier = document.getElementById('magnifier');
     const bigImg = document.getElementById('big-img');
     
     bigCard.addEventListener('mouseenter', function() {
         magnifier.style.display = 'block';
     });
     
     bigCard.addEventListener('mousemove', function(event) {
         const bounds = this.getBoundingClientRect();
         const x = event.clientX - bounds.left;
         const y = event.clientY - bounds.top;
         const ratioX = bigImg.width / bounds.width;
         const ratioY = bigImg.height / bounds.height;
         const offsetX = (event.clientX - bounds.left) * ratioX;
         const offsetY = (event.clientY - bounds.top) * ratioY;
     
         // Calculate the position of the magnifier relative to the mouse cursor
         const magnifierX = x - 100; // Adjust this value to position the magnifier horizontally
         const magnifierY = y + 100; // Adjust this value to position the magnifier vertically
     
         // Ensure the magnifier stays within the boundaries of the image
         magnifier.style.left = `${Math.max(0, Math.min(bounds.width - 200, magnifierX))}px`;
         magnifier.style.top = `${Math.max(0, Math.min(bounds.height - 200, magnifierY))}px`;
     
         magnifier.style.width = '150px'; // Set the width of the magnifier
         magnifier.style.height = '150px'; // Set the height of the magnifier
     
         magnifier.style.backgroundImage = `url('${bigImg.src}')`;
         magnifier.style.backgroundSize = `${bigImg.width * ratioX}px ${bigImg.height * ratioY}px`;
         magnifier.style.backgroundPosition = `-${offsetX}px -${offsetY}px`;
         magnifier.style.backgroundRepeat = 'no-repeat'; // Prevent background image from repeating
     });
     
     bigCard.addEventListener('mouseleave', function() {
         magnifier.style.display = 'none';
     });
     
     
     
      
     
                 //count increaser single product
           // Get the button elements
           var decreaseButton = document.getElementById("decreaseQuantity");
           var increaseButton = document.getElementById("increaseQuantity");
           var quantityElement = document.getElementById("productQuantity"); // Corrected ID
           
           // Add click event listeners to the buttons
           decreaseButton.addEventListener("click", function() {
               // Get the current quantity value
               var currentQuantity = parseInt(quantityElement.value);
           
               // Decrease the quantity by one if greater than 1
               if (currentQuantity > 1) {
                   currentQuantity--;
               }
           
               // Update the quantity value in the input field
               quantityElement.value = currentQuantity;
           });
           
           increaseButton.addEventListener("click", function() {
               // Get the current quantity value
               var currentQuantity = parseInt(quantityElement.value);
           
               // Increase the quantity by one
               currentQuantity++;
           
               // Update the quantity value in the input field
               quantityElement.value = currentQuantity;
           });