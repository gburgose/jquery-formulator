(function ( $ ) {

  'use strict'

  $.fn.formulator = function( options ) {

    var settings = $.extend({
      //callback : function(data, textStatus, jqXHR){}
    }, options );

    var constructor = function ( $form ){

      var $fields = $form.find('input, select, textarea');
      var $submit = $form.find('button[type="submit"], submit');

      var formDisabled = function(){
        
        $submit.prop('disabled', true);
        
        $fields.change(function(){
          $submit.prop('disabled', false);
        });

        $fields.each(function( index ) {
          if ( $( this ).val() !== "" ){
            $submit.prop('disabled', false);
          }
        });

        $fields.bind('keypress',function(){
          $submit.prop('disabled', false);
        });

      }

      // Validate Form

      var formValidate = function(){

        if ( $form.hasClass('form-validate') && !$form.hasClass('form-validate-load') ){

          $form.addClass('form-validate-load');

          $fields.each(function(i, e) {
            if (!$(e).hasClass('not-required')) {
              $(e).prop('required', true);
            }
          });

          var $errors = $form.find('.form-errors');
          $errors.html('<ul></ul>');

          $form.validate({
              ignore: ".ignore",
              errorContainer: $errors,
              errorLabelContainer: $("ul", $errors),
              wrapper: "li",
              invalidHandler: function(form, validator) {
                var errors;
                return errors = validator.numberOfInvalids();
              },
              submitHandler: function(form) {
                return true;
              }
          });

        }

      }

      // Ajax Form

      var formAjax = function(){

        if ( $form.hasClass('form-ajax') && !$form.hasClass('form-ajax-load') ){

          $form.addClass('form-ajax-load');

          $submit = $form.find('[type="submit"]');
          $submit.prop('disabled', true);
          
          options = {
            dataType: 'JSON',
            success: function(data, textStatus, jqXHR) {

              var _title   = '';
              var _text    = '';
              var _type    = 'error';
              var _button  = '';

              swal({
                title             : data.message.title,
                text              : data.message.text,
                type              : data.message.type,
                confirmButtonText : data.message.button
              });

              if ( data.success == true ){
                $form[0].reset();
              }

            },
            complete: function() {
              return $submit.prop('disabled', false);
            }
          };

          return $form.ajaxForm(options);

        }

      }

      var formReload = function(){

        if ( $form.hasClass('form-reload') && !$form.hasClass('form-reload-load') ){

          $form.addClass('form-reload-load');

          // On init

          $fields.prop('disabled', true);

          $fields.each(function(i,e){
            var _name = $(e).attr('name');
            var _queries = _queryString();
            $(e).val( _queries[_name] );
            $(e).prop('disabled', false);
          });

          // On change

          $fields.change(function(){
            $form.submit();
          });

        }

      }

      var formReCaptcha = function(){

        if ( $form.hasClass('form-recaptcha') && !$form.hasClass('form-recaptcha-load') ){

          $form.addClass('form-recaptcha-load');

          // Create captcha

          var captcha = document.createElement('div');
          $(captcha).attr("data-sitekey","6LdmQyMUAAAAALUF-R2vXHw6Htm-O6TDsjq79mjT")
                    .attr('data-size','invisible')
                    .addClass("g-recaptcha");
          $form.append( $(captcha) );

          // Create Script

          var _url = "https://www.google.com/recaptcha/api.js";

          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = _url;
          script.id = 'google-recaptcha';
          script.async = true;
          script.defer = true;
          document.body.appendChild(script);


        }

      }

      // Get url var
      // This function is anonymous, is executed immediately and 
      // the return value is assigned to QueryString!

      var _queryString = function () {
        
        var query_string = {};
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
          var pair = vars[i].split("=");
              // If first entry with this name
          if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
              // If second entry with this name
          } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]],decodeURIComponent(pair[1]) ];
            query_string[pair[0]] = arr;
              // If third or later entry with this name
          } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
          }
        } 
        return query_string;
      }

      // Init
      formValidate();
      formAjax();
      formDisabled();
      formReload();
      formReCaptcha();

    }

    return this.each(function () {
      constructor( $(this) );
    });

  };  

}( jQuery ));