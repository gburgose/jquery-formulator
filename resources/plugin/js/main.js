(function ( $ ) {

	$.fn.formulator = function( options ) {

		var settings = $.extend({
				sample : "sample"
		}, options );

		$form = $(this);

		// Ready
		$form.addClass('formulator-load');

		function disabledButton(){
			$form.find('button[type="submit"], submit').prop('disabled', true);
			$form.find('input, textarea, select').change(function(){
				$form.find('button[type="submit"], submit').prop('disabled', false);
			});
		}


		function validateForm(){

			if ( $form.hasClass('form-validate') ){

				$container = $form.find('.form-errors');

				$form.validate({
						'errorContainer': $container,
						'errorLabelContainer': $('ul', $container),
						'wrapper': 'li',
						'invalidHandler': function(form, validator) {
							var errors;
							return errors = validator.numberOfInvalids();
						},
						'submitHandler': function(form) {
							console.log('send form');
							ajax($form);
							return true;
						}
				});

			}

		}

		// Init
		disabledButton();
		validateForm();

	};

}( jQuery ));