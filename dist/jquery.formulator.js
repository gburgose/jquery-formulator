(function ( $ ) {

	$.fn.formulator = function( options ) {

		var settings = $.extend({
				sample : "sample"
		}, options );

		$form = $(this);

		// Ready
		$form.addClass('formulator-load');

		// @state: true or false.
		function disabledButton( state ){
			$form.find('button[type="submit"], submit').prop('disabled', state);
			$form.find('')
		}

		// Init
		disabledButton( true );

	};

}( jQuery ));