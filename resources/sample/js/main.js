window._ = require('lodash');
window.$ = window.jQuery = require('jquery');

require("bootstrap-sass");

// dependecies

require("jquery-form");
require("jquery-validation");
require("jquery.rut");
var swal = require('sweetalert');

require("../../plugin/js/main.js");

$(document).ready(function(){

  // TABS

  $('.nav-tabs a').click(function(){
    $(this).tab('show');
  });

  // FORMS
	
	$('form').formulator({
		onAjax : function( data ){
			console.log( data );
		}
	});

});