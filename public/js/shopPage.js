
function applyFilters() {
// Collect selected filters
var selectedFilters = {
  categories: [],
  prices: [],
  colors: [],
  sizes: []
};

// Categories
$("input[name='shirt']:checked").each(function() {
  selectedFilters.categories.push($(this).val());
});
$("input[name='pant']:checked").each(function() {
  selectedFilters.categories.push($(this).val());
});
$("input[name='hoody']:checked").each(function() {
  selectedFilters.categories.push($(this).val());
});

// Prices
$("input[value='1']:checked").each(function() {
  selectedFilters.prices.push(parseInt($(this).val()));
});
$("input[value='2']:checked").each(function() {
  selectedFilters.prices.push(parseInt($(this).val()));
});
$("input[value='3']:checked").each(function() {
  selectedFilters.prices.push(parseInt($(this).val()));
});

// Colors
$("input[name='blc']:checked").each(function() {
  selectedFilters.colors.push($(this).val());
});
$("input[name='w']:checked").each(function() {
  selectedFilters.colors.push($(this).val());
});
$("input[name='blu']:checked").each(function() {
  selectedFilters.colors.push($(this).val());
});

// Sizes
$("input[name='s-m']:checked").each(function() {
  selectedFilters.sizes.push($(this).val());
});
$("input[name='s-l']:checked").each(function() {
  selectedFilters.sizes.push($(this).val());
});
$("input[name='s-xl']:checked").each(function() {
  selectedFilters.sizes.push($(this).val());
});

// Here you can do whatever you want with the selected filters
console.log(selectedFilters);
// For example, you can send them to the server via AJAX
// $.ajax({
//     url: 'your_backend_endpoint',
//     type: 'POST',
//     data: selectedFilters,
//     success: function(response) {
//         // Handle success
//     },
//     error: function(xhr, status, error) {
//         // Handle error
//     }
// });
}

function removeFilters() {
// Uncheck all checkboxes
$("input[type='checkbox']").prop('checked', false);
}
