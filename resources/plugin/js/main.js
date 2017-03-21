(function ( $ ) {

	$.fn.formulatorContruct = function( options ) {

		$form   = $(this);
		$fields = $form.find('input, select, textarea');
		$submit = $form.find('button[type="submit"], submit');

		var __formDisabled = function(){
			$submit.prop('disabled', true);
			$fields.change(function(){
				alert("OK");
				$submit.prop('disabled', false);
			});
		}

		// Validate Form

		var __formValidate = function(){

			if ( $form.hasClass('form-validate') ){

				$form.addClass('form-validate-load');

				$fields.each(function(i, e) {
					console.log(i);
					if (!$(e).hasClass('not-required')) {
						$(e).prop('required', true);
					}
				});

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
							return true;
						}
				});

			}

		}

		// Ajax Form

		var __formAjax = function(){

			if ( $form.hasClass('form-ajax') ){

				$form.addClass('form-ajax-load');

				$submit = $form.find('[type="submit"]');
				$submit.prop('disabled', true);
				
				options = {
					dataType: 'JSON',
					success: function(data, textStatus, jqXHR) {
						console.log(data);
					},
					complete: function() {
						return $submit.prop('disabled', false);
					}
				};

				return $form.ajaxForm(options);

			}

		}

		var __formReload = function(){

		}

		// Init
		__formDisabled();
		__formValidate();
		__formAjax();
		__formReload();

	};


	$.fn.formulator = function( options ) {

		var settings = $.extend({
				sample   : "sample",
				callback : function(){}
		}, options );

		return this.each(function () {
			console.log( $(this) );
			$(this).formulatorContruct( settings );
		});

	};

	

}( jQuery ));