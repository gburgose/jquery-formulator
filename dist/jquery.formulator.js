(function($) {
  'use strict'
  $.fn.formulator = function(options) {
    var settings = $.extend({
      callback: function(data, textStatus, jqXHR) {}
    }, options);
    var constructor = function($form) {
      var $fields = $form.find('input, select, textarea');
      var $submit = $form.find('button[type="submit"], submit');
      var formDisabled = function() {
        $submit.prop('disabled', true);
        $fields.change(function() {
          $submit.prop('disabled', false);
        });
      }
      var formValidate = function() {
        if ($form.hasClass('form-validate') && !$form.hasClass('form-validate-load')) {
          $form.addClass('form-validate-load');
          $fields.each(function(i, e) {
            if (!$(e).hasClass('not-required')) {
              $(e).prop('required', true);
            }
          });
          var $errors = $form.find('.form-errors');
          $errors.html('<ul></ul>');
          $form.validate({
            'errorContainer': $errors,
            'errorLabelContainer': $('ul', $errors),
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
      var formAjax = function() {
        if ($form.hasClass('form-ajax') && !$form.hasClass('form-ajax-load')) {
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
      var formReload = function() {
        if ($form.hasClass('form-reload') && !$form.hasClass('form-reload-load')) {
          $form.addClass('form-reload-load');
          $fields.each(function(i, e) {
            var _name = $(e).attr('name');
            var _queries = _queryString();
            $(e).val(_queries[_name]);
          });
          $fields.change(function() {
            $form.submit();
          });
        }
      }
      var _queryString = function() {
        var query_string = {};
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split("=");
          if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
          } else if (typeof query_string[pair[0]] === "string") {
            var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
            query_string[pair[0]] = arr;
          } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
          }
        }
        return query_string;
      }
      formDisabled();
      formValidate();
      formAjax();
      formReload();
    }
    return this.each(function() {
      constructor($(this));
    });
  };
}(jQuery));