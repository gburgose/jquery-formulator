window._ = require('lodash');
window.$ = window.jQuery = require('jquery');

require("jquery-form");
require("jquery-validation");
require("jquery.rut");
var swal = require('sweetalert');

require("../../plugin/js/main.js");

$(document).ready(function(){
	
	$('form').formulator({
		onAjax : function( data ){
			console.log( data );
		}
	});

});