
function decreaseQuantity(button) {
    var input = button.nextElementSibling;
    var value = parseInt(input.value);
    if (value > 1) {
        input.value = value - 1;
    }
}

function increaseQuantity(button) {
    var input = button.previousElementSibling;
    var value = parseInt(input.value);
    input.value = value + 1;
}
