(function ( $ ) {

	"use strict"

	$.fn.formulator = function( options ) {

		var settings = $.extend({
				callback : function(data, textStatus, jqXHR){}
		}, options );

		var constructor = function ( $form ){

			var $fields = $form.find('input, select, textarea');
			var $submit = $form.find('button[type="submit"], submit');

			var __formDisabled = function(){
				$submit.prop('disabled', true);
				$fields.change(function(){
					$submit.prop('disabled', false);
				});
			}

			// Validate Form

			var __formValidate = function(){

				if ( $form.hasClass('form-validate') ){

					$form.addClass('form-validate-load');

					$fields.each(function(i, e) {
						if (!$(e).hasClass('not-required')) {
							$(e).prop('required', true);
						}
					});

					var $container = $form.find('.form-errors');

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
							options.callback.call(data, textStatus, jqXHR);
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

		}

		return this.each(function () {
			constructor( $(this) );
		});

	};	

}( jQuery ));