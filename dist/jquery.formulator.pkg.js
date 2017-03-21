/*!
 * jQuery Form Plugin
 * version: 4.2.0
 * Requires jQuery v1.7 or later
 * Copyright 2017 Kevin Morris
 * Copyright 2006 M. Alsup
 * Project repository: https://github.com/jquery-form/form
 * Dual licensed under the MIT and LGPLv3 licenses.
 * https://github.com/jquery-form/form#license
 */
/* global ActiveXObject */

/* eslint-disable */
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node/CommonJS
    module.exports = function(root, jQuery) {
      if (typeof jQuery === 'undefined') {
        // require('jQuery') returns a factory that requires window to build a jQuery instance, we normalize how we use modules
        // that require this pattern but the window provided is a noop if it's defined (how jquery works)
        if (typeof window !== 'undefined') {
          jQuery = require('jquery');
        } else {
          jQuery = require('jquery')(root);
        }
      }
      factory(jQuery);
      return jQuery;
    };
  } else {
    // Browser globals
    factory(jQuery);
  }

}(function($) {
  /* eslint-enable */
  'use strict';

  /*
  	Usage Note:
  	-----------
  	Do not use both ajaxSubmit and ajaxForm on the same form. These
  	functions are mutually exclusive. Use ajaxSubmit if you want
  	to bind your own submit handler to the form. For example,

  	$(document).ready(function() {
  		$('#myForm').on('submit', function(e) {
  			e.preventDefault(); // <-- important
  			$(this).ajaxSubmit({
  				target: '#output'
  			});
  		});
  	});

  	Use ajaxForm when you want the plugin to manage all the event binding
  	for you. For example,

  	$(document).ready(function() {
  		$('#myForm').ajaxForm({
  			target: '#output'
  		});
  	});

  	You can also use ajaxForm with delegation (requires jQuery v1.7+), so the
  	form does not have to exist when you invoke ajaxForm:

  	$('#myForm').ajaxForm({
  		delegation: true,
  		target: '#output'
  	});

  	When using ajaxForm, the ajaxSubmit function will be invoked for you
  	at the appropriate time.
  */

  var rCRLF = /\r?\n/g;

  /**
   * Feature detection
   */
  var feature = {};

  feature.fileapi = $('<input type="file">').get(0).files !== undefined;
  feature.formdata = (typeof window.FormData !== 'undefined');

  var hasProp = !!$.fn.prop;

  // attr2 uses prop when it can but checks the return type for
  // an expected string. This accounts for the case where a form
  // contains inputs with names like "action" or "method"; in those
  // cases "prop" returns the element
  $.fn.attr2 = function() {
    if (!hasProp) {
      return this.attr.apply(this, arguments);
    }

    var val = this.prop.apply(this, arguments);

    if ((val && val.jquery) || typeof val === 'string') {
      return val;
    }

    return this.attr.apply(this, arguments);
  };

  /**
   * ajaxSubmit() provides a mechanism for immediately submitting
   * an HTML form using AJAX.
   *
   * @param	{object|string}	options		jquery.form.js parameters or custom url for submission
   * @param	{object}		data		extraData
   * @param	{string}		dataType	ajax dataType
   * @param	{function}		onSuccess	ajax success callback function
   */
  $.fn.ajaxSubmit = function(options, data, dataType, onSuccess) {
    // fast fail if nothing selected (http://dev.jquery.com/ticket/2752)
    if (!this.length) {
      log('ajaxSubmit: skipping submit process - no element selected');

      return this;
    }

    /* eslint consistent-this: ["error", "$form"] */
    var method, action, url, $form = this;

    if (typeof options === 'function') {
      options = {
        success: options
      };

    } else if (typeof options === 'string' || (options === false && arguments.length > 0)) {
      options = {
        'url': options,
        'data': data,
        'dataType': dataType
      };

      if (typeof onSuccess === 'function') {
        options.success = onSuccess;
      }

    } else if (typeof options === 'undefined') {
      options = {};
    }

    method = options.method || options.type || this.attr2('method');
    action = options.url || this.attr2('action');

    url = (typeof action === 'string') ? $.trim(action) : '';
    url = url || window.location.href || '';
    if (url) {
      // clean url (don't include hash vaue)
      url = (url.match(/^([^#]+)/) || [])[1];
    }

    options = $.extend(true, {
      url: url,
      success: $.ajaxSettings.success,
      type: method || $.ajaxSettings.type,
      iframeSrc: /^https/i.test(window.location.href || '') ? 'javascript:false' : 'about:blank' // eslint-disable-line no-script-url
    }, options);

    // hook for manipulating the form data before it is extracted;
    // convenient for use with rich editors like tinyMCE or FCKEditor
    var veto = {};

    this.trigger('form-pre-serialize', [this, options, veto]);

    if (veto.veto) {
      log('ajaxSubmit: submit vetoed via form-pre-serialize trigger');

      return this;
    }

    // provide opportunity to alter form data before it is serialized
    if (options.beforeSerialize && options.beforeSerialize(this, options) === false) {
      log('ajaxSubmit: submit aborted via beforeSerialize callback');

      return this;
    }

    var traditional = options.traditional;

    if (typeof traditional === 'undefined') {
      traditional = $.ajaxSettings.traditional;
    }

    var elements = [];
    var qx, a = this.formToArray(options.semantic, elements, options.filtering);

    if (options.data) {
      var optionsData = $.isFunction(options.data) ? options.data(a) : options.data;

      options.extraData = optionsData;
      qx = $.param(optionsData, traditional);
    }

    // give pre-submit callback an opportunity to abort the submit
    if (options.beforeSubmit && options.beforeSubmit(a, this, options) === false) {
      log('ajaxSubmit: submit aborted via beforeSubmit callback');

      return this;
    }

    // fire vetoable 'validate' event
    this.trigger('form-submit-validate', [a, this, options, veto]);
    if (veto.veto) {
      log('ajaxSubmit: submit vetoed via form-submit-validate trigger');

      return this;
    }

    var q = $.param(a, traditional);

    if (qx) {
      q = (q ? (q + '&' + qx) : qx);
    }

    if (options.type.toUpperCase() === 'GET') {
      options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + q;
      options.data = null; // data is null for 'get'
    } else {
      options.data = q; // data is the query string for 'post'
    }

    var callbacks = [];

    if (options.resetForm) {
      callbacks.push(function() {
        $form.resetForm();
      });
    }

    if (options.clearForm) {
      callbacks.push(function() {
        $form.clearForm(options.includeHidden);
      });
    }

    // perform a load on the target only if dataType is not provided
    if (!options.dataType && options.target) {
      var oldSuccess = options.success || function() {};

      callbacks.push(function(data, textStatus, jqXHR) {
        var successArguments = arguments,
          fn = options.replaceTarget ? 'replaceWith' : 'html';

        $(options.target)[fn](data).each(function() {
          oldSuccess.apply(this, successArguments);
        });
      });

    } else if (options.success) {
      if ($.isArray(options.success)) {
        $.merge(callbacks, options.success);
      } else {
        callbacks.push(options.success);
      }
    }

    options.success = function(data, status, xhr) { // jQuery 1.4+ passes xhr as 3rd arg
      var context = options.context || this; // jQuery 1.4+ supports scope context

      for (var i = 0, max = callbacks.length; i < max; i++) {
        callbacks[i].apply(context, [data, status, xhr || $form, $form]);
      }
    };

    if (options.error) {
      var oldError = options.error;

      options.error = function(xhr, status, error) {
        var context = options.context || this;

        oldError.apply(context, [xhr, status, error, $form]);
      };
    }

    if (options.complete) {
      var oldComplete = options.complete;

      options.complete = function(xhr, status) {
        var context = options.context || this;

        oldComplete.apply(context, [xhr, status, $form]);
      };
    }

    // are there files to upload?

    // [value] (issue #113), also see comment:
    // https://github.com/malsup/form/commit/588306aedba1de01388032d5f42a60159eea9228#commitcomment-2180219
    var fileInputs = $('input[type=file]:enabled', this).filter(function() {
      return $(this).val() !== '';
    });
    var hasFileInputs = fileInputs.length > 0;
    var mp = 'multipart/form-data';
    var multipart = ($form.attr('enctype') === mp || $form.attr('encoding') === mp);
    var fileAPI = feature.fileapi && feature.formdata;

    log('fileAPI :' + fileAPI);

    var shouldUseFrame = (hasFileInputs || multipart) && !fileAPI;
    var jqxhr;

    // options.iframe allows user to force iframe mode
    // 06-NOV-09: now defaulting to iframe mode if file input is detected
    if (options.iframe !== false && (options.iframe || shouldUseFrame)) {
      // hack to fix Safari hang (thanks to Tim Molendijk for this)
      // see: http://groups.google.com/group/jquery-dev/browse_thread/thread/36395b7ab510dd5d
      if (options.closeKeepAlive) {
        $.get(options.closeKeepAlive, function() {
          jqxhr = fileUploadIframe(a);
        });

      } else {
        jqxhr = fileUploadIframe(a);
      }

    } else if ((hasFileInputs || multipart) && fileAPI) {
      jqxhr = fileUploadXhr(a);

    } else {
      jqxhr = $.ajax(options);
    }

    $form.removeData('jqxhr').data('jqxhr', jqxhr);

    // clear element array
    for (var k = 0; k < elements.length; k++) {
      elements[k] = null;
    }

    // fire 'notify' event
    this.trigger('form-submit-notify', [this, options]);

    return this;

    // utility fn for deep serialization
    function deepSerialize(extraData) {
      var serialized = $.param(extraData, options.traditional).split('&');
      var len = serialized.length;
      var result = [];
      var i, part;

      for (i = 0; i < len; i++) {
        part = serialized[i].split('=');
        // #278; use array instead of object storage, favoring array serializations
        result.push([decodeURIComponent(part[0]), decodeURIComponent(part[1])]);
      }

      return result;
    }

    // XMLHttpRequest Level 2 file uploads (big hat tip to francois2metz)
    function fileUploadXhr(a) {
      var formdata = new FormData();

      for (var i = 0; i < a.length; i++) {
        formdata.append(a[i].name, a[i].value);
      }

      if (options.extraData) {
        var serializedData = deepSerialize(options.extraData);

        for (i = 0; i < serializedData.length; i++) {
          if (serializedData[i]) {
            formdata.append(serializedData[i][0], serializedData[i][1]);
          }
        }
      }

      options.data = null;

      var s = $.extend(true, {}, $.ajaxSettings, options, {
        contentType: false,
        processData: false,
        cache: false,
        type: method || 'POST'
      });

      if (options.uploadProgress) {
        // workaround because jqXHR does not expose upload property
        s.xhr = function() {
          var xhr = $.ajaxSettings.xhr();

          if (xhr.upload) {
            xhr.upload.addEventListener('progress', function(event) {
              var percent = 0;
              var position = event.loaded || event.position; /* event.position is deprecated */
              var total = event.total;

              if (event.lengthComputable) {
                percent = Math.ceil(position / total * 100);
              }

              options.uploadProgress(event, position, total, percent);
            }, false);
          }

          return xhr;
        };
      }

      s.data = null;

      var beforeSend = s.beforeSend;

      s.beforeSend = function(xhr, o) {
        // Send FormData() provided by user
        if (options.formData) {
          o.data = options.formData;
        } else {
          o.data = formdata;
        }

        if (beforeSend) {
          beforeSend.call(this, xhr, o);
        }
      };

      return $.ajax(s);
    }

    // private function for handling file uploads (hat tip to YAHOO!)
    function fileUploadIframe(a) {
      var form = $form[0],
        el, i, s, g, id, $io, io, xhr, sub, n, timedOut, timeoutHandle;
      var deferred = $.Deferred();

      // #341
      deferred.abort = function(status) {
        xhr.abort(status);
      };

      if (a) {
        // ensure that every serialized input is still enabled
        for (i = 0; i < elements.length; i++) {
          el = $(elements[i]);
          if (hasProp) {
            el.prop('disabled', false);
          } else {
            el.removeAttr('disabled');
          }
        }
      }

      s = $.extend(true, {}, $.ajaxSettings, options);
      s.context = s.context || s;
      id = 'jqFormIO' + new Date().getTime();
      var ownerDocument = form.ownerDocument;
      var $body = $form.closest('body');

      if (s.iframeTarget) {
        $io = $(s.iframeTarget, ownerDocument);
        n = $io.attr2('name');
        if (!n) {
          $io.attr2('name', id);
        } else {
          id = n;
        }

      } else {
        $io = $('<iframe name="' + id + '" src="' + s.iframeSrc + '" />', ownerDocument);
        $io.css({
          position: 'absolute',
          top: '-1000px',
          left: '-1000px'
        });
      }
      io = $io[0];


      xhr = { // mock object
        aborted: 0,
        responseText: null,
        responseXML: null,
        status: 0,
        statusText: 'n/a',
        getAllResponseHeaders: function() {},
        getResponseHeader: function() {},
        setRequestHeader: function() {},
        abort: function(status) {
          var e = (status === 'timeout' ? 'timeout' : 'aborted');

          log('aborting upload... ' + e);
          this.aborted = 1;

          try { // #214, #257
            if (io.contentWindow.document.execCommand) {
              io.contentWindow.document.execCommand('Stop');
            }
          } catch (ignore) {}

          $io.attr('src', s.iframeSrc); // abort op in progress
          xhr.error = e;
          if (s.error) {
            s.error.call(s.context, xhr, e, status);
          }

          if (g) {
            $.event.trigger('ajaxError', [xhr, s, e]);
          }

          if (s.complete) {
            s.complete.call(s.context, xhr, e);
          }
        }
      };

      g = s.global;
      // trigger ajax global events so that activity/block indicators work like normal
      if (g && $.active++ === 0) {
        $.event.trigger('ajaxStart');
      }
      if (g) {
        $.event.trigger('ajaxSend', [xhr, s]);
      }

      if (s.beforeSend && s.beforeSend.call(s.context, xhr, s) === false) {
        if (s.global) {
          $.active--;
        }
        deferred.reject();

        return deferred;
      }

      if (xhr.aborted) {
        deferred.reject();

        return deferred;
      }

      // add submitting element to data if we know it
      sub = form.clk;
      if (sub) {
        n = sub.name;
        if (n && !sub.disabled) {
          s.extraData = s.extraData || {};
          s.extraData[n] = sub.value;
          if (sub.type === 'image') {
            s.extraData[n + '.x'] = form.clk_x;
            s.extraData[n + '.y'] = form.clk_y;
          }
        }
      }

      var CLIENT_TIMEOUT_ABORT = 1;
      var SERVER_ABORT = 2;

      function getDoc(frame) {
        /* it looks like contentWindow or contentDocument do not
         * carry the protocol property in ie8, when running under ssl
         * frame.document is the only valid response document, since
         * the protocol is know but not on the other two objects. strange?
         * "Same origin policy" http://en.wikipedia.org/wiki/Same_origin_policy
         */

        var doc = null;

        // IE8 cascading access check
        try {
          if (frame.contentWindow) {
            doc = frame.contentWindow.document;
          }
        } catch (err) {
          // IE8 access denied under ssl & missing protocol
          log('cannot get iframe.contentWindow document: ' + err);
        }

        if (doc) { // successful getting content
          return doc;
        }

        try { // simply checking may throw in ie8 under ssl or mismatched protocol
          doc = frame.contentDocument ? frame.contentDocument : frame.document;
        } catch (err) {
          // last attempt
          log('cannot get iframe.contentDocument: ' + err);
          doc = frame.document;
        }

        return doc;
      }

      // Rails CSRF hack (thanks to Yvan Barthelemy)
      var csrf_token = $('meta[name=csrf-token]').attr('content');
      var csrf_param = $('meta[name=csrf-param]').attr('content');

      if (csrf_param && csrf_token) {
        s.extraData = s.extraData || {};
        s.extraData[csrf_param] = csrf_token;
      }

      // take a breath so that pending repaints get some cpu time before the upload starts
      function doSubmit() {
        // make sure form attrs are set
        var t = $form.attr2('target'),
          a = $form.attr2('action'),
          mp = 'multipart/form-data',
          et = $form.attr('enctype') || $form.attr('encoding') || mp;

        // update form attrs in IE friendly way
        form.setAttribute('target', id);
        if (!method || /post/i.test(method)) {
          form.setAttribute('method', 'POST');
        }
        if (a !== s.url) {
          form.setAttribute('action', s.url);
        }

        // ie borks in some cases when setting encoding
        if (!s.skipEncodingOverride && (!method || /post/i.test(method))) {
          $form.attr({
            encoding: 'multipart/form-data',
            enctype: 'multipart/form-data'
          });
        }

        // support timout
        if (s.timeout) {
          timeoutHandle = setTimeout(function() {
            timedOut = true;
            cb(CLIENT_TIMEOUT_ABORT);
          }, s.timeout);
        }

        // look for server aborts
        function checkState() {
          try {
            var state = getDoc(io).readyState;

            log('state = ' + state);
            if (state && state.toLowerCase() === 'uninitialized') {
              setTimeout(checkState, 50);
            }

          } catch (e) {
            log('Server abort: ', e, ' (', e.name, ')');
            cb(SERVER_ABORT); // eslint-disable-line callback-return
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }
            timeoutHandle = undefined;
          }
        }

        // add "extra" data to form if provided in options
        var extraInputs = [];

        try {
          if (s.extraData) {
            for (var n in s.extraData) {
              if (s.extraData.hasOwnProperty(n)) {
                // if using the $.param format that allows for multiple values with the same name
                if ($.isPlainObject(s.extraData[n]) && s.extraData[n].hasOwnProperty('name') && s.extraData[n].hasOwnProperty('value')) {
                  extraInputs.push(
                    $('<input type="hidden" name="' + s.extraData[n].name + '">', ownerDocument).val(s.extraData[n].value)
                    .appendTo(form)[0]);
                } else {
                  extraInputs.push(
                    $('<input type="hidden" name="' + n + '">', ownerDocument).val(s.extraData[n])
                    .appendTo(form)[0]);
                }
              }
            }
          }

          if (!s.iframeTarget) {
            // add iframe to doc and submit the form
            $io.appendTo($body);
          }

          if (io.attachEvent) {
            io.attachEvent('onload', cb);
          } else {
            io.addEventListener('load', cb, false);
          }

          setTimeout(checkState, 15);

          try {
            form.submit();

          } catch (err) {
            // just in case form has element with name/id of 'submit'
            var submitFn = document.createElement('form').submit;

            submitFn.apply(form);
          }

        } finally {
          // reset attrs and remove "extra" input elements
          form.setAttribute('action', a);
          form.setAttribute('enctype', et); // #380
          if (t) {
            form.setAttribute('target', t);
          } else {
            $form.removeAttr('target');
          }
          $(extraInputs).remove();
        }
      }

      if (s.forceSync) {
        doSubmit();
      } else {
        setTimeout(doSubmit, 10); // this lets dom updates render
      }

      var data, doc, domCheckCount = 50,
        callbackProcessed;

      function cb(e) {
        if (xhr.aborted || callbackProcessed) {
          return;
        }

        doc = getDoc(io);
        if (!doc) {
          log('cannot access response document');
          e = SERVER_ABORT;
        }
        if (e === CLIENT_TIMEOUT_ABORT && xhr) {
          xhr.abort('timeout');
          deferred.reject(xhr, 'timeout');

          return;

        } else if (e === SERVER_ABORT && xhr) {
          xhr.abort('server abort');
          deferred.reject(xhr, 'error', 'server abort');

          return;
        }

        if (!doc || doc.location.href === s.iframeSrc) {
          // response not received yet
          if (!timedOut) {
            return;
          }
        }

        if (io.detachEvent) {
          io.detachEvent('onload', cb);
        } else {
          io.removeEventListener('load', cb, false);
        }

        var status = 'success',
          errMsg;

        try {
          if (timedOut) {
            throw 'timeout';
          }

          var isXml = s.dataType === 'xml' || doc.XMLDocument || $.isXMLDoc(doc);

          log('isXml=' + isXml);

          if (!isXml && window.opera && (doc.body === null || !doc.body.innerHTML)) {
            if (--domCheckCount) {
              // in some browsers (Opera) the iframe DOM is not always traversable when
              // the onload callback fires, so we loop a bit to accommodate
              log('requeing onLoad callback, DOM not available');
              setTimeout(cb, 250);

              return;
            }
            // let this fall through because server response could be an empty document
            // log('Could not access iframe DOM after mutiple tries.');
            // throw 'DOMException: not available';
          }

          // log('response detected');
          var docRoot = doc.body ? doc.body : doc.documentElement;

          xhr.responseText = docRoot ? docRoot.innerHTML : null;
          xhr.responseXML = doc.XMLDocument ? doc.XMLDocument : doc;
          if (isXml) {
            s.dataType = 'xml';
          }
          xhr.getResponseHeader = function(header) {
            var headers = {
              'content-type': s.dataType
            };

            return headers[header.toLowerCase()];
          };
          // support for XHR 'status' & 'statusText' emulation :
          if (docRoot) {
            xhr.status = Number(docRoot.getAttribute('status')) || xhr.status;
            xhr.statusText = docRoot.getAttribute('statusText') || xhr.statusText;
          }

          var dt = (s.dataType || '').toLowerCase();
          var scr = /(json|script|text)/.test(dt);

          if (scr || s.textarea) {
            // see if user embedded response in textarea
            var ta = doc.getElementsByTagName('textarea')[0];

            if (ta) {
              xhr.responseText = ta.value;
              // support for XHR 'status' & 'statusText' emulation :
              xhr.status = Number(ta.getAttribute('status')) || xhr.status;
              xhr.statusText = ta.getAttribute('statusText') || xhr.statusText;

            } else if (scr) {
              // account for browsers injecting pre around json response
              var pre = doc.getElementsByTagName('pre')[0];
              var b = doc.getElementsByTagName('body')[0];

              if (pre) {
                xhr.responseText = pre.textContent ? pre.textContent : pre.innerText;
              } else if (b) {
                xhr.responseText = b.textContent ? b.textContent : b.innerText;
              }
            }

          } else if (dt === 'xml' && !xhr.responseXML && xhr.responseText) {
            xhr.responseXML = toXml(xhr.responseText); // eslint-disable-line no-use-before-define
          }

          try {
            data = httpData(xhr, dt, s); // eslint-disable-line no-use-before-define

          } catch (err) {
            status = 'parsererror';
            xhr.error = errMsg = (err || status);
          }

        } catch (err) {
          log('error caught: ', err);
          status = 'error';
          xhr.error = errMsg = (err || status);
        }

        if (xhr.aborted) {
          log('upload aborted');
          status = null;
        }

        if (xhr.status) { // we've set xhr.status
          status = ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) ? 'success' : 'error';
        }

        // ordering of these callbacks/triggers is odd, but that's how $.ajax does it
        if (status === 'success') {
          if (s.success) {
            s.success.call(s.context, data, 'success', xhr);
          }

          deferred.resolve(xhr.responseText, 'success', xhr);

          if (g) {
            $.event.trigger('ajaxSuccess', [xhr, s]);
          }

        } else if (status) {
          if (typeof errMsg === 'undefined') {
            errMsg = xhr.statusText;
          }
          if (s.error) {
            s.error.call(s.context, xhr, status, errMsg);
          }
          deferred.reject(xhr, 'error', errMsg);
          if (g) {
            $.event.trigger('ajaxError', [xhr, s, errMsg]);
          }
        }

        if (g) {
          $.event.trigger('ajaxComplete', [xhr, s]);
        }

        if (g && !--$.active) {
          $.event.trigger('ajaxStop');
        }

        if (s.complete) {
          s.complete.call(s.context, xhr, status);
        }

        callbackProcessed = true;
        if (s.timeout) {
          clearTimeout(timeoutHandle);
        }

        // clean up
        setTimeout(function() {
          if (!s.iframeTarget) {
            $io.remove();
          } else { // adding else to clean up existing iframe response.
            $io.attr('src', s.iframeSrc);
          }
          xhr.responseXML = null;
        }, 100);
      }

      var toXml = $.parseXML || function(s, doc) { // use parseXML if available (jQuery 1.5+)
        if (window.ActiveXObject) {
          doc = new ActiveXObject('Microsoft.XMLDOM');
          doc.async = 'false';
          doc.loadXML(s);

        } else {
          doc = (new DOMParser()).parseFromString(s, 'text/xml');
        }

        return (doc && doc.documentElement && doc.documentElement.nodeName !== 'parsererror') ? doc : null;
      };
      var parseJSON = $.parseJSON || function(s) {
        /* jslint evil:true */
        return window['eval']('(' + s + ')'); // eslint-disable-line dot-notation
      };

      var httpData = function(xhr, type, s) { // mostly lifted from jq1.4.4

        var ct = xhr.getResponseHeader('content-type') || '',
          xml = ((type === 'xml' || !type) && ct.indexOf('xml') >= 0),
          data = xml ? xhr.responseXML : xhr.responseText;

        if (xml && data.documentElement.nodeName === 'parsererror') {
          if ($.error) {
            $.error('parsererror');
          }
        }
        if (s && s.dataFilter) {
          data = s.dataFilter(data, type);
        }
        if (typeof data === 'string') {
          if ((type === 'json' || !type) && ct.indexOf('json') >= 0) {
            data = parseJSON(data);
          } else if ((type === 'script' || !type) && ct.indexOf('javascript') >= 0) {
            $.globalEval(data);
          }
        }

        return data;
      };

      return deferred;
    }
  };

  /**
   * ajaxForm() provides a mechanism for fully automating form submission.
   *
   * The advantages of using this method instead of ajaxSubmit() are:
   *
   * 1: This method will include coordinates for <input type="image"> elements (if the element
   *	is used to submit the form).
   * 2. This method will include the submit element's name/value data (for the element that was
   *	used to submit the form).
   * 3. This method binds the submit() method to the form for you.
   *
   * The options argument for ajaxForm works exactly as it does for ajaxSubmit. ajaxForm merely
   * passes the options argument along after properly binding events for submit elements and
   * the form itself.
   */
  $.fn.ajaxForm = function(options, data, dataType, onSuccess) {
    if (typeof options === 'string' || (options === false && arguments.length > 0)) {
      options = {
        'url': options,
        'data': data,
        'dataType': dataType
      };

      if (typeof onSuccess === 'function') {
        options.success = onSuccess;
      }
    }

    options = options || {};
    options.delegation = options.delegation && $.isFunction($.fn.on);

    // in jQuery 1.3+ we can fix mistakes with the ready state
    if (!options.delegation && this.length === 0) {
      var o = {
        s: this.selector,
        c: this.context
      };

      if (!$.isReady && o.s) {
        log('DOM not ready, queuing ajaxForm');
        $(function() {
          $(o.s, o.c).ajaxForm(options);
        });

        return this;
      }

      // is your DOM ready?  http://docs.jquery.com/Tutorials:Introducing_$(document).ready()
      log('terminating; zero elements found by selector' + ($.isReady ? '' : ' (DOM not ready)'));

      return this;
    }

    if (options.delegation) {
      $(document)
        .off('submit.form-plugin', this.selector, doAjaxSubmit)
        .off('click.form-plugin', this.selector, captureSubmittingElement)
        .on('submit.form-plugin', this.selector, options, doAjaxSubmit)
        .on('click.form-plugin', this.selector, options, captureSubmittingElement);

      return this;
    }

    return this.ajaxFormUnbind()
      .on('submit.form-plugin', options, doAjaxSubmit)
      .on('click.form-plugin', options, captureSubmittingElement);
  };

  // private event handlers
  function doAjaxSubmit(e) {
    /* jshint validthis:true */
    var options = e.data;

    if (!e.isDefaultPrevented()) { // if event has been canceled, don't proceed
      e.preventDefault();
      $(e.target).closest('form').ajaxSubmit(options); // #365
    }
  }

  function captureSubmittingElement(e) {
    /* jshint validthis:true */
    var target = e.target;
    var $el = $(target);

    if (!$el.is('[type=submit],[type=image]')) {
      // is this a child element of the submit el?  (ex: a span within a button)
      var t = $el.closest('[type=submit]');

      if (t.length === 0) {
        return;
      }
      target = t[0];
    }

    var form = target.form;

    form.clk = target;

    if (target.type === 'image') {
      if (typeof e.offsetX !== 'undefined') {
        form.clk_x = e.offsetX;
        form.clk_y = e.offsetY;

      } else if (typeof $.fn.offset === 'function') {
        var offset = $el.offset();

        form.clk_x = e.pageX - offset.left;
        form.clk_y = e.pageY - offset.top;

      } else {
        form.clk_x = e.pageX - target.offsetLeft;
        form.clk_y = e.pageY - target.offsetTop;
      }
    }
    // clear form vars
    setTimeout(function() {
      form.clk = form.clk_x = form.clk_y = null;
    }, 100);
  }


  // ajaxFormUnbind unbinds the event handlers that were bound by ajaxForm
  $.fn.ajaxFormUnbind = function() {
    return this.off('submit.form-plugin click.form-plugin');
  };

  /**
   * formToArray() gathers form element data into an array of objects that can
   * be passed to any of the following ajax functions: $.get, $.post, or load.
   * Each object in the array has both a 'name' and 'value' property. An example of
   * an array for a simple login form might be:
   *
   * [ { name: 'username', value: 'jresig' }, { name: 'password', value: 'secret' } ]
   *
   * It is this array that is passed to pre-submit callback functions provided to the
   * ajaxSubmit() and ajaxForm() methods.
   */
  $.fn.formToArray = function(semantic, elements, filtering) {
    var a = [];

    if (this.length === 0) {
      return a;
    }

    var form = this[0];
    var formId = this.attr('id');
    var els = (semantic || typeof form.elements === 'undefined') ? form.getElementsByTagName('*') : form.elements;
    var els2;

    if (els) {
      els = $.makeArray(els); // convert to standard array
    }

    // #386; account for inputs outside the form which use the 'form' attribute
    // FinesseRus: in non-IE browsers outside fields are already included in form.elements.
    if (formId && (semantic || /(Edge|Trident)\//.test(navigator.userAgent))) {
      els2 = $(':input[form="' + formId + '"]').get(); // hat tip @thet
      if (els2.length) {
        els = (els || []).concat(els2);
      }
    }

    if (!els || !els.length) {
      return a;
    }

    if ($.isFunction(filtering)) {
      els = $.map(els, filtering);
    }

    var i, j, n, v, el, max, jmax;

    for (i = 0, max = els.length; i < max; i++) {
      el = els[i];
      n = el.name;
      if (!n || el.disabled) {
        continue;
      }

      if (semantic && form.clk && el.type === 'image') {
        // handle image inputs on the fly when semantic == true
        if (form.clk === el) {
          a.push({
            name: n,
            value: $(el).val(),
            type: el.type
          });
          a.push({
            name: n + '.x',
            value: form.clk_x
          }, {
            name: n + '.y',
            value: form.clk_y
          });
        }
        continue;
      }

      v = $.fieldValue(el, true);
      if (v && v.constructor === Array) {
        if (elements) {
          elements.push(el);
        }
        for (j = 0, jmax = v.length; j < jmax; j++) {
          a.push({
            name: n,
            value: v[j]
          });
        }

      } else if (feature.fileapi && el.type === 'file') {
        if (elements) {
          elements.push(el);
        }

        var files = el.files;

        if (files.length) {
          for (j = 0; j < files.length; j++) {
            a.push({
              name: n,
              value: files[j],
              type: el.type
            });
          }
        } else {
          // #180
          a.push({
            name: n,
            value: '',
            type: el.type
          });
        }

      } else if (v !== null && typeof v !== 'undefined') {
        if (elements) {
          elements.push(el);
        }
        a.push({
          name: n,
          value: v,
          type: el.type,
          required: el.required
        });
      }
    }

    if (!semantic && form.clk) {
      // input type=='image' are not found in elements array! handle it here
      var $input = $(form.clk),
        input = $input[0];

      n = input.name;

      if (n && !input.disabled && input.type === 'image') {
        a.push({
          name: n,
          value: $input.val()
        });
        a.push({
          name: n + '.x',
          value: form.clk_x
        }, {
          name: n + '.y',
          value: form.clk_y
        });
      }
    }

    return a;
  };

  /**
   * Serializes form data into a 'submittable' string. This method will return a string
   * in the format: name1=value1&amp;name2=value2
   */
  $.fn.formSerialize = function(semantic) {
    // hand off to jQuery.param for proper encoding
    return $.param(this.formToArray(semantic));
  };

  /**
   * Serializes all field elements in the jQuery object into a query string.
   * This method will return a string in the format: name1=value1&amp;name2=value2
   */
  $.fn.fieldSerialize = function(successful) {
    var a = [];

    this.each(function() {
      var n = this.name;

      if (!n) {
        return;
      }

      var v = $.fieldValue(this, successful);

      if (v && v.constructor === Array) {
        for (var i = 0, max = v.length; i < max; i++) {
          a.push({
            name: n,
            value: v[i]
          });
        }

      } else if (v !== null && typeof v !== 'undefined') {
        a.push({
          name: this.name,
          value: v
        });
      }
    });

    // hand off to jQuery.param for proper encoding
    return $.param(a);
  };

  /**
   * Returns the value(s) of the element in the matched set. For example, consider the following form:
   *
   *	<form><fieldset>
   *		<input name="A" type="text">
   *		<input name="A" type="text">
   *		<input name="B" type="checkbox" value="B1">
   *		<input name="B" type="checkbox" value="B2">
   *		<input name="C" type="radio" value="C1">
   *		<input name="C" type="radio" value="C2">
   *	</fieldset></form>
   *
   *	var v = $('input[type=text]').fieldValue();
   *	// if no values are entered into the text inputs
   *	v === ['','']
   *	// if values entered into the text inputs are 'foo' and 'bar'
   *	v === ['foo','bar']
   *
   *	var v = $('input[type=checkbox]').fieldValue();
   *	// if neither checkbox is checked
   *	v === undefined
   *	// if both checkboxes are checked
   *	v === ['B1', 'B2']
   *
   *	var v = $('input[type=radio]').fieldValue();
   *	// if neither radio is checked
   *	v === undefined
   *	// if first radio is checked
   *	v === ['C1']
   *
   * The successful argument controls whether or not the field element must be 'successful'
   * (per http://www.w3.org/TR/html4/interact/forms.html#successful-controls).
   * The default value of the successful argument is true. If this value is false the value(s)
   * for each element is returned.
   *
   * Note: This method *always* returns an array. If no valid value can be determined the
   *	array will be empty, otherwise it will contain one or more values.
   */
  $.fn.fieldValue = function(successful) {
    for (var val = [], i = 0, max = this.length; i < max; i++) {
      var el = this[i];
      var v = $.fieldValue(el, successful);

      if (v === null || typeof v === 'undefined' || (v.constructor === Array && !v.length)) {
        continue;
      }

      if (v.constructor === Array) {
        $.merge(val, v);
      } else {
        val.push(v);
      }
    }

    return val;
  };

  /**
   * Returns the value of the field element.
   */
  $.fieldValue = function(el, successful) {
    var n = el.name,
      t = el.type,
      tag = el.tagName.toLowerCase();

    if (typeof successful === 'undefined') {
      successful = true;
    }

    /* eslint-disable no-mixed-operators */
    if (successful && (!n || el.disabled || t === 'reset' || t === 'button' ||
        (t === 'checkbox' || t === 'radio') && !el.checked ||
        (t === 'submit' || t === 'image') && el.form && el.form.clk !== el ||
        tag === 'select' && el.selectedIndex === -1)) {
      /* eslint-enable no-mixed-operators */
      return null;
    }

    if (tag === 'select') {
      var index = el.selectedIndex;

      if (index < 0) {
        return null;
      }

      var a = [],
        ops = el.options;
      var one = (t === 'select-one');
      var max = (one ? index + 1 : ops.length);

      for (var i = (one ? index : 0); i < max; i++) {
        var op = ops[i];

        if (op.selected && !op.disabled) {
          var v = op.value;

          if (!v) { // extra pain for IE...
            v = (op.attributes && op.attributes.value && !(op.attributes.value.specified)) ? op.text : op.value;
          }

          if (one) {
            return v;
          }

          a.push(v);
        }
      }

      return a;
    }

    return $(el).val().replace(rCRLF, '\r\n');
  };

  /**
   * Clears the form data. Takes the following actions on the form's input fields:
   *  - input text fields will have their 'value' property set to the empty string
   *  - select elements will have their 'selectedIndex' property set to -1
   *  - checkbox and radio inputs will have their 'checked' property set to false
   *  - inputs of type submit, button, reset, and hidden will *not* be effected
   *  - button elements will *not* be effected
   */
  $.fn.clearForm = function(includeHidden) {
    return this.each(function() {
      $('input,select,textarea', this).clearFields(includeHidden);
    });
  };

  /**
   * Clears the selected form elements.
   */
  $.fn.clearFields = $.fn.clearInputs = function(includeHidden) {
    var re = /^(?:color|date|datetime|email|month|number|password|range|search|tel|text|time|url|week)$/i; // 'hidden' is not in this list

    return this.each(function() {
      var t = this.type,
        tag = this.tagName.toLowerCase();

      if (re.test(t) || tag === 'textarea') {
        this.value = '';

      } else if (t === 'checkbox' || t === 'radio') {
        this.checked = false;

      } else if (tag === 'select') {
        this.selectedIndex = -1;

      } else if (t === 'file') {
        if (/MSIE/.test(navigator.userAgent)) {
          $(this).replaceWith($(this).clone(true));
        } else {
          $(this).val('');
        }

      } else if (includeHidden) {
        // includeHidden can be the value true, or it can be a selector string
        // indicating a special test; for example:
        // $('#myForm').clearForm('.special:hidden')
        // the above would clean hidden inputs that have the class of 'special'
        if ((includeHidden === true && /hidden/.test(t)) ||
          (typeof includeHidden === 'string' && $(this).is(includeHidden))) {
          this.value = '';
        }
      }
    });
  };


  /**
   * Resets the form data or individual elements. Takes the following actions
   * on the selected tags:
   * - all fields within form elements will be reset to their original value
   * - input / textarea / select fields will be reset to their original value
   * - option / optgroup fields (for multi-selects) will defaulted individually
   * - non-multiple options will find the right select to default
   * - label elements will be searched against its 'for' attribute
   * - all others will be searched for appropriate children to default
   */
  $.fn.resetForm = function() {
    return this.each(function() {
      var el = $(this);
      var tag = this.tagName.toLowerCase();

      switch (tag) {
        case 'input':
          this.checked = this.defaultChecked;
          // fall through

        case 'textarea':
          this.value = this.defaultValue;

          return true;

        case 'option':
        case 'optgroup':
          var select = el.parents('select');

          if (select.length && select[0].multiple) {
            if (tag === 'option') {
              this.selected = this.defaultSelected;
            } else {
              el.find('option').resetForm();
            }
          } else {
            select.resetForm();
          }

          return true;

        case 'select':
          el.find('option').each(function(i) { // eslint-disable-line consistent-return
            this.selected = this.defaultSelected;
            if (this.defaultSelected && !el[0].multiple) {
              el[0].selectedIndex = i;

              return false;
            }
          });

          return true;

        case 'label':
          var forEl = $(el.attr('for'));
          var list = el.find('input,select,textarea');

          if (forEl[0]) {
            list.unshift(forEl[0]);
          }

          list.resetForm();

          return true;

        case 'form':
          // guard against an input with the name of 'reset'
          // note that IE reports the reset function as an 'object'
          if (typeof this.reset === 'function' || (typeof this.reset === 'object' && !this.reset.nodeType)) {
            this.reset();
          }

          return true;

        default:
          el.find('form,input,label,select,textarea').resetForm();

          return true;
      }
    });
  };

  /**
   * Enables or disables any matching elements.
   */
  $.fn.enable = function(b) {
    if (typeof b === 'undefined') {
      b = true;
    }

    return this.each(function() {
      this.disabled = !b;
    });
  };

  /**
   * Checks/unchecks any matching checkboxes or radio buttons and
   * selects/deselects and matching option elements.
   */
  $.fn.selected = function(select) {
    if (typeof select === 'undefined') {
      select = true;
    }

    return this.each(function() {
      var t = this.type;

      if (t === 'checkbox' || t === 'radio') {
        this.checked = select;

      } else if (this.tagName.toLowerCase() === 'option') {
        var $sel = $(this).parent('select');

        if (select && $sel[0] && $sel[0].type === 'select-one') {
          // deselect all other options
          $sel.find('option').selected(false);
        }

        this.selected = select;
      }
    });
  };

  // expose debug var
  $.fn.ajaxSubmit.debug = false;

  // helper fn for console logging
  function log() {
    if (!$.fn.ajaxSubmit.debug) {
      return;
    }

    var msg = '[jquery.form] ' + Array.prototype.join.call(arguments, '');

    if (window.console && window.console.log) {
      window.console.log(msg);

    } else if (window.opera && window.opera.postError) {
      window.opera.postError(msg);
    }
  }
}));
/*!
 * jQuery Validation Plugin v1.16.0
 *
 * http://jqueryvalidation.org/
 *
 * Copyright (c) 2016 Jörn Zaefferer
 * Released under the MIT license
 */
(function(factory) {
  if (typeof define === "function" && define.amd) {
    define(["jquery"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("jquery"));
  } else {
    factory(jQuery);
  }
}(function($) {

  $.extend($.fn, {

    // http://jqueryvalidation.org/validate/
    validate: function(options) {

      // If nothing is selected, return nothing; can't chain anyway
      if (!this.length) {
        if (options && options.debug && window.console) {
          console.warn("Nothing selected, can't validate, returning nothing.");
        }
        return;
      }

      // Check if a validator for this form was already created
      var validator = $.data(this[0], "validator");
      if (validator) {
        return validator;
      }

      // Add novalidate tag if HTML5.
      this.attr("novalidate", "novalidate");

      validator = new $.validator(options, this[0]);
      $.data(this[0], "validator", validator);

      if (validator.settings.onsubmit) {

        this.on("click.validate", ":submit", function(event) {
          if (validator.settings.submitHandler) {
            validator.submitButton = event.target;
          }

          // Allow suppressing validation by adding a cancel class to the submit button
          if ($(this).hasClass("cancel")) {
            validator.cancelSubmit = true;
          }

          // Allow suppressing validation by adding the html5 formnovalidate attribute to the submit button
          if ($(this).attr("formnovalidate") !== undefined) {
            validator.cancelSubmit = true;
          }
        });

        // Validate the form on submit
        this.on("submit.validate", function(event) {
          if (validator.settings.debug) {

            // Prevent form submit to be able to see console output
            event.preventDefault();
          }

          function handle() {
            var hidden, result;
            if (validator.settings.submitHandler) {
              if (validator.submitButton) {

                // Insert a hidden input as a replacement for the missing submit button
                hidden = $("<input type='hidden'/>")
                  .attr("name", validator.submitButton.name)
                  .val($(validator.submitButton).val())
                  .appendTo(validator.currentForm);
              }
              result = validator.settings.submitHandler.call(validator, validator.currentForm, event);
              if (validator.submitButton) {

                // And clean up afterwards; thanks to no-block-scope, hidden can be referenced
                hidden.remove();
              }
              if (result !== undefined) {
                return result;
              }
              return false;
            }
            return true;
          }

          // Prevent submit for invalid forms or custom submit handlers
          if (validator.cancelSubmit) {
            validator.cancelSubmit = false;
            return handle();
          }
          if (validator.form()) {
            if (validator.pendingRequest) {
              validator.formSubmitted = true;
              return false;
            }
            return handle();
          } else {
            validator.focusInvalid();
            return false;
          }
        });
      }

      return validator;
    },

    // http://jqueryvalidation.org/valid/
    valid: function() {
      var valid, validator, errorList;

      if ($(this[0]).is("form")) {
        valid = this.validate().form();
      } else {
        errorList = [];
        valid = true;
        validator = $(this[0].form).validate();
        this.each(function() {
          valid = validator.element(this) && valid;
          if (!valid) {
            errorList = errorList.concat(validator.errorList);
          }
        });
        validator.errorList = errorList;
      }
      return valid;
    },

    // http://jqueryvalidation.org/rules/
    rules: function(command, argument) {
      var element = this[0],
        settings, staticRules, existingRules, data, param, filtered;

      // If nothing is selected, return empty object; can't chain anyway
      if (element == null || element.form == null) {
        return;
      }

      if (command) {
        settings = $.data(element.form, "validator").settings;
        staticRules = settings.rules;
        existingRules = $.validator.staticRules(element);
        switch (command) {
          case "add":
            $.extend(existingRules, $.validator.normalizeRule(argument));

            // Remove messages from rules, but allow them to be set separately
            delete existingRules.messages;
            staticRules[element.name] = existingRules;
            if (argument.messages) {
              settings.messages[element.name] = $.extend(settings.messages[element.name], argument.messages);
            }
            break;
          case "remove":
            if (!argument) {
              delete staticRules[element.name];
              return existingRules;
            }
            filtered = {};
            $.each(argument.split(/\s/), function(index, method) {
              filtered[method] = existingRules[method];
              delete existingRules[method];
              if (method === "required") {
                $(element).removeAttr("aria-required");
              }
            });
            return filtered;
        }
      }

      data = $.validator.normalizeRules(
        $.extend({},
          $.validator.classRules(element),
          $.validator.attributeRules(element),
          $.validator.dataRules(element),
          $.validator.staticRules(element)
        ), element);

      // Make sure required is at front
      if (data.required) {
        param = data.required;
        delete data.required;
        data = $.extend({
          required: param
        }, data);
        $(element).attr("aria-required", "true");
      }

      // Make sure remote is at back
      if (data.remote) {
        param = data.remote;
        delete data.remote;
        data = $.extend(data, {
          remote: param
        });
      }

      return data;
    }
  });

  // Custom selectors
  $.extend($.expr.pseudos || $.expr[":"], { // '|| $.expr[ ":" ]' here enables backwards compatibility to jQuery 1.7. Can be removed when dropping jQ 1.7.x support

    // http://jqueryvalidation.org/blank-selector/
    blank: function(a) {
      return !$.trim("" + $(a).val());
    },

    // http://jqueryvalidation.org/filled-selector/
    filled: function(a) {
      var val = $(a).val();
      return val !== null && !!$.trim("" + val);
    },

    // http://jqueryvalidation.org/unchecked-selector/
    unchecked: function(a) {
      return !$(a).prop("checked");
    }
  });

  // Constructor for validator
  $.validator = function(options, form) {
    this.settings = $.extend(true, {}, $.validator.defaults, options);
    this.currentForm = form;
    this.init();
  };

  // http://jqueryvalidation.org/jQuery.validator.format/
  $.validator.format = function(source, params) {
    if (arguments.length === 1) {
      return function() {
        var args = $.makeArray(arguments);
        args.unshift(source);
        return $.validator.format.apply(this, args);
      };
    }
    if (params === undefined) {
      return source;
    }
    if (arguments.length > 2 && params.constructor !== Array) {
      params = $.makeArray(arguments).slice(1);
    }
    if (params.constructor !== Array) {
      params = [params];
    }
    $.each(params, function(i, n) {
      source = source.replace(new RegExp("\\{" + i + "\\}", "g"), function() {
        return n;
      });
    });
    return source;
  };

  $.extend($.validator, {

    defaults: {
      messages: {},
      groups: {},
      rules: {},
      errorClass: "error",
      pendingClass: "pending",
      validClass: "valid",
      errorElement: "label",
      focusCleanup: false,
      focusInvalid: true,
      errorContainer: $([]),
      errorLabelContainer: $([]),
      onsubmit: true,
      ignore: ":hidden",
      ignoreTitle: false,
      onfocusin: function(element) {
        this.lastActive = element;

        // Hide error label and remove error class on focus if enabled
        if (this.settings.focusCleanup) {
          if (this.settings.unhighlight) {
            this.settings.unhighlight.call(this, element, this.settings.errorClass, this.settings.validClass);
          }
          this.hideThese(this.errorsFor(element));
        }
      },
      onfocusout: function(element) {
        if (!this.checkable(element) && (element.name in this.submitted || !this.optional(element))) {
          this.element(element);
        }
      },
      onkeyup: function(element, event) {

        // Avoid revalidate the field when pressing one of the following keys
        // Shift       => 16
        // Ctrl        => 17
        // Alt         => 18
        // Caps lock   => 20
        // End         => 35
        // Home        => 36
        // Left arrow  => 37
        // Up arrow    => 38
        // Right arrow => 39
        // Down arrow  => 40
        // Insert      => 45
        // Num lock    => 144
        // AltGr key   => 225
        var excludedKeys = [
          16, 17, 18, 20, 35, 36, 37,
          38, 39, 40, 45, 144, 225
        ];

        if (event.which === 9 && this.elementValue(element) === "" || $.inArray(event.keyCode, excludedKeys) !== -1) {
          return;
        } else if (element.name in this.submitted || element.name in this.invalid) {
          this.element(element);
        }
      },
      onclick: function(element) {

        // Click on selects, radiobuttons and checkboxes
        if (element.name in this.submitted) {
          this.element(element);

          // Or option elements, check parent select in that case
        } else if (element.parentNode.name in this.submitted) {
          this.element(element.parentNode);
        }
      },
      highlight: function(element, errorClass, validClass) {
        if (element.type === "radio") {
          this.findByName(element.name).addClass(errorClass).removeClass(validClass);
        } else {
          $(element).addClass(errorClass).removeClass(validClass);
        }
      },
      unhighlight: function(element, errorClass, validClass) {
        if (element.type === "radio") {
          this.findByName(element.name).removeClass(errorClass).addClass(validClass);
        } else {
          $(element).removeClass(errorClass).addClass(validClass);
        }
      }
    },

    // http://jqueryvalidation.org/jQuery.validator.setDefaults/
    setDefaults: function(settings) {
      $.extend($.validator.defaults, settings);
    },

    messages: {
      required: "This field is required.",
      remote: "Please fix this field.",
      email: "Please enter a valid email address.",
      url: "Please enter a valid URL.",
      date: "Please enter a valid date.",
      dateISO: "Please enter a valid date (ISO).",
      number: "Please enter a valid number.",
      digits: "Please enter only digits.",
      equalTo: "Please enter the same value again.",
      maxlength: $.validator.format("Please enter no more than {0} characters."),
      minlength: $.validator.format("Please enter at least {0} characters."),
      rangelength: $.validator.format("Please enter a value between {0} and {1} characters long."),
      range: $.validator.format("Please enter a value between {0} and {1}."),
      max: $.validator.format("Please enter a value less than or equal to {0}."),
      min: $.validator.format("Please enter a value greater than or equal to {0}."),
      step: $.validator.format("Please enter a multiple of {0}.")
    },

    autoCreateRanges: false,

    prototype: {

      init: function() {
        this.labelContainer = $(this.settings.errorLabelContainer);
        this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm);
        this.containers = $(this.settings.errorContainer).add(this.settings.errorLabelContainer);
        this.submitted = {};
        this.valueCache = {};
        this.pendingRequest = 0;
        this.pending = {};
        this.invalid = {};
        this.reset();

        var groups = (this.groups = {}),
          rules;
        $.each(this.settings.groups, function(key, value) {
          if (typeof value === "string") {
            value = value.split(/\s/);
          }
          $.each(value, function(index, name) {
            groups[name] = key;
          });
        });
        rules = this.settings.rules;
        $.each(rules, function(key, value) {
          rules[key] = $.validator.normalizeRule(value);
        });

        function delegate(event) {

          // Set form expando on contenteditable
          if (!this.form && this.hasAttribute("contenteditable")) {
            this.form = $(this).closest("form")[0];
          }

          var validator = $.data(this.form, "validator"),
            eventType = "on" + event.type.replace(/^validate/, ""),
            settings = validator.settings;
          if (settings[eventType] && !$(this).is(settings.ignore)) {
            settings[eventType].call(validator, this, event);
          }
        }

        $(this.currentForm)
          .on("focusin.validate focusout.validate keyup.validate",
            ":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], " +
            "[type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], " +
            "[type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], " +
            "[type='radio'], [type='checkbox'], [contenteditable], [type='button']", delegate)

          // Support: Chrome, oldIE
          // "select" is provided as event.target when clicking a option
          .on("click.validate", "select, option, [type='radio'], [type='checkbox']", delegate);

        if (this.settings.invalidHandler) {
          $(this.currentForm).on("invalid-form.validate", this.settings.invalidHandler);
        }

        // Add aria-required to any Static/Data/Class required fields before first validation
        // Screen readers require this attribute to be present before the initial submission http://www.w3.org/TR/WCAG-TECHS/ARIA2.html
        $(this.currentForm).find("[required], [data-rule-required], .required").attr("aria-required", "true");
      },

      // http://jqueryvalidation.org/Validator.form/
      form: function() {
        this.checkForm();
        $.extend(this.submitted, this.errorMap);
        this.invalid = $.extend({}, this.errorMap);
        if (!this.valid()) {
          $(this.currentForm).triggerHandler("invalid-form", [this]);
        }
        this.showErrors();
        return this.valid();
      },

      checkForm: function() {
        this.prepareForm();
        for (var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++) {
          this.check(elements[i]);
        }
        return this.valid();
      },

      // http://jqueryvalidation.org/Validator.element/
      element: function(element) {
        var cleanElement = this.clean(element),
          checkElement = this.validationTargetFor(cleanElement),
          v = this,
          result = true,
          rs, group;

        if (checkElement === undefined) {
          delete this.invalid[cleanElement.name];
        } else {
          this.prepareElement(checkElement);
          this.currentElements = $(checkElement);

          // If this element is grouped, then validate all group elements already
          // containing a value
          group = this.groups[checkElement.name];
          if (group) {
            $.each(this.groups, function(name, testgroup) {
              if (testgroup === group && name !== checkElement.name) {
                cleanElement = v.validationTargetFor(v.clean(v.findByName(name)));
                if (cleanElement && cleanElement.name in v.invalid) {
                  v.currentElements.push(cleanElement);
                  result = v.check(cleanElement) && result;
                }
              }
            });
          }

          rs = this.check(checkElement) !== false;
          result = result && rs;
          if (rs) {
            this.invalid[checkElement.name] = false;
          } else {
            this.invalid[checkElement.name] = true;
          }

          if (!this.numberOfInvalids()) {

            // Hide error containers on last error
            this.toHide = this.toHide.add(this.containers);
          }
          this.showErrors();

          // Add aria-invalid status for screen readers
          $(element).attr("aria-invalid", !rs);
        }

        return result;
      },

      // http://jqueryvalidation.org/Validator.showErrors/
      showErrors: function(errors) {
        if (errors) {
          var validator = this;

          // Add items to error list and map
          $.extend(this.errorMap, errors);
          this.errorList = $.map(this.errorMap, function(message, name) {
            return {
              message: message,
              element: validator.findByName(name)[0]
            };
          });

          // Remove items from success list
          this.successList = $.grep(this.successList, function(element) {
            return !(element.name in errors);
          });
        }
        if (this.settings.showErrors) {
          this.settings.showErrors.call(this, this.errorMap, this.errorList);
        } else {
          this.defaultShowErrors();
        }
      },

      // http://jqueryvalidation.org/Validator.resetForm/
      resetForm: function() {
        if ($.fn.resetForm) {
          $(this.currentForm).resetForm();
        }
        this.invalid = {};
        this.submitted = {};
        this.prepareForm();
        this.hideErrors();
        var elements = this.elements()
          .removeData("previousValue")
          .removeAttr("aria-invalid");

        this.resetElements(elements);
      },

      resetElements: function(elements) {
        var i;

        if (this.settings.unhighlight) {
          for (i = 0; elements[i]; i++) {
            this.settings.unhighlight.call(this, elements[i],
              this.settings.errorClass, "");
            this.findByName(elements[i].name).removeClass(this.settings.validClass);
          }
        } else {
          elements
            .removeClass(this.settings.errorClass)
            .removeClass(this.settings.validClass);
        }
      },

      numberOfInvalids: function() {
        return this.objectLength(this.invalid);
      },

      objectLength: function(obj) {
        /* jshint unused: false */
        var count = 0,
          i;
        for (i in obj) {
          if (obj[i]) {
            count++;
          }
        }
        return count;
      },

      hideErrors: function() {
        this.hideThese(this.toHide);
      },

      hideThese: function(errors) {
        errors.not(this.containers).text("");
        this.addWrapper(errors).hide();
      },

      valid: function() {
        return this.size() === 0;
      },

      size: function() {
        return this.errorList.length;
      },

      focusInvalid: function() {
        if (this.settings.focusInvalid) {
          try {
            $(this.findLastActive() || this.errorList.length && this.errorList[0].element || [])
              .filter(":visible")
              .focus()

              // Manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
              .trigger("focusin");
          } catch (e) {

            // Ignore IE throwing errors when focusing hidden elements
          }
        }
      },

      findLastActive: function() {
        var lastActive = this.lastActive;
        return lastActive && $.grep(this.errorList, function(n) {
          return n.element.name === lastActive.name;
        }).length === 1 && lastActive;
      },

      elements: function() {
        var validator = this,
          rulesCache = {};

        // Select all valid inputs inside the form (no submit or reset buttons)
        return $(this.currentForm)
          .find("input, select, textarea, [contenteditable]")
          .not(":submit, :reset, :image, :disabled")
          .not(this.settings.ignore)
          .filter(function() {
            var name = this.name || $(this).attr("name"); // For contenteditable
            if (!name && validator.settings.debug && window.console) {
              console.error("%o has no name assigned", this);
            }

            // Set form expando on contenteditable
            if (this.hasAttribute("contenteditable")) {
              this.form = $(this).closest("form")[0];
            }

            // Select only the first element for each name, and only those with rules specified
            if (name in rulesCache || !validator.objectLength($(this).rules())) {
              return false;
            }

            rulesCache[name] = true;
            return true;
          });
      },

      clean: function(selector) {
        return $(selector)[0];
      },

      errors: function() {
        var errorClass = this.settings.errorClass.split(" ").join(".");
        return $(this.settings.errorElement + "." + errorClass, this.errorContext);
      },

      resetInternals: function() {
        this.successList = [];
        this.errorList = [];
        this.errorMap = {};
        this.toShow = $([]);
        this.toHide = $([]);
      },

      reset: function() {
        this.resetInternals();
        this.currentElements = $([]);
      },

      prepareForm: function() {
        this.reset();
        this.toHide = this.errors().add(this.containers);
      },

      prepareElement: function(element) {
        this.reset();
        this.toHide = this.errorsFor(element);
      },

      elementValue: function(element) {
        var $element = $(element),
          type = element.type,
          val, idx;

        if (type === "radio" || type === "checkbox") {
          return this.findByName(element.name).filter(":checked").val();
        } else if (type === "number" && typeof element.validity !== "undefined") {
          return element.validity.badInput ? "NaN" : $element.val();
        }

        if (element.hasAttribute("contenteditable")) {
          val = $element.text();
        } else {
          val = $element.val();
        }

        if (type === "file") {

          // Modern browser (chrome & safari)
          if (val.substr(0, 12) === "C:\\fakepath\\") {
            return val.substr(12);
          }

          // Legacy browsers
          // Unix-based path
          idx = val.lastIndexOf("/");
          if (idx >= 0) {
            return val.substr(idx + 1);
          }

          // Windows-based path
          idx = val.lastIndexOf("\\");
          if (idx >= 0) {
            return val.substr(idx + 1);
          }

          // Just the file name
          return val;
        }

        if (typeof val === "string") {
          return val.replace(/\r/g, "");
        }
        return val;
      },

      check: function(element) {
        element = this.validationTargetFor(this.clean(element));

        var rules = $(element).rules(),
          rulesCount = $.map(rules, function(n, i) {
            return i;
          }).length,
          dependencyMismatch = false,
          val = this.elementValue(element),
          result, method, rule;

        // If a normalizer is defined for this element, then
        // call it to retreive the changed value instead
        // of using the real one.
        // Note that `this` in the normalizer is `element`.
        if (typeof rules.normalizer === "function") {
          val = rules.normalizer.call(element, val);

          if (typeof val !== "string") {
            throw new TypeError("The normalizer should return a string value.");
          }

          // Delete the normalizer from rules to avoid treating
          // it as a pre-defined method.
          delete rules.normalizer;
        }

        for (method in rules) {
          rule = {
            method: method,
            parameters: rules[method]
          };
          try {
            result = $.validator.methods[method].call(this, val, element, rule.parameters);

            // If a method indicates that the field is optional and therefore valid,
            // don't mark it as valid when there are no other rules
            if (result === "dependency-mismatch" && rulesCount === 1) {
              dependencyMismatch = true;
              continue;
            }
            dependencyMismatch = false;

            if (result === "pending") {
              this.toHide = this.toHide.not(this.errorsFor(element));
              return;
            }

            if (!result) {
              this.formatAndAdd(element, rule);
              return false;
            }
          } catch (e) {
            if (this.settings.debug && window.console) {
              console.log("Exception occurred when checking element " + element.id + ", check the '" + rule.method + "' method.", e);
            }
            if (e instanceof TypeError) {
              e.message += ".  Exception occurred when checking element " + element.id + ", check the '" + rule.method + "' method.";
            }

            throw e;
          }
        }
        if (dependencyMismatch) {
          return;
        }
        if (this.objectLength(rules)) {
          this.successList.push(element);
        }
        return true;
      },

      // Return the custom message for the given element and validation method
      // specified in the element's HTML5 data attribute
      // return the generic message if present and no method specific message is present
      customDataMessage: function(element, method) {
        return $(element).data("msg" + method.charAt(0).toUpperCase() +
          method.substring(1).toLowerCase()) || $(element).data("msg");
      },

      // Return the custom message for the given element name and validation method
      customMessage: function(name, method) {
        var m = this.settings.messages[name];
        return m && (m.constructor === String ? m : m[method]);
      },

      // Return the first defined argument, allowing empty strings
      findDefined: function() {
        for (var i = 0; i < arguments.length; i++) {
          if (arguments[i] !== undefined) {
            return arguments[i];
          }
        }
        return undefined;
      },

      // The second parameter 'rule' used to be a string, and extended to an object literal
      // of the following form:
      // rule = {
      //     method: "method name",
      //     parameters: "the given method parameters"
      // }
      //
      // The old behavior still supported, kept to maintain backward compatibility with
      // old code, and will be removed in the next major release.
      defaultMessage: function(element, rule) {
        if (typeof rule === "string") {
          rule = {
            method: rule
          };
        }

        var message = this.findDefined(
            this.customMessage(element.name, rule.method),
            this.customDataMessage(element, rule.method),

            // 'title' is never undefined, so handle empty string as undefined
            !this.settings.ignoreTitle && element.title || undefined,
            $.validator.messages[rule.method],
            "<strong>Warning: No message defined for " + element.name + "</strong>"
          ),
          theregex = /\$?\{(\d+)\}/g;
        if (typeof message === "function") {
          message = message.call(this, rule.parameters, element);
        } else if (theregex.test(message)) {
          message = $.validator.format(message.replace(theregex, "{$1}"), rule.parameters);
        }

        return message;
      },

      formatAndAdd: function(element, rule) {
        var message = this.defaultMessage(element, rule);

        this.errorList.push({
          message: message,
          element: element,
          method: rule.method
        });

        this.errorMap[element.name] = message;
        this.submitted[element.name] = message;
      },

      addWrapper: function(toToggle) {
        if (this.settings.wrapper) {
          toToggle = toToggle.add(toToggle.parent(this.settings.wrapper));
        }
        return toToggle;
      },

      defaultShowErrors: function() {
        var i, elements, error;
        for (i = 0; this.errorList[i]; i++) {
          error = this.errorList[i];
          if (this.settings.highlight) {
            this.settings.highlight.call(this, error.element, this.settings.errorClass, this.settings.validClass);
          }
          this.showLabel(error.element, error.message);
        }
        if (this.errorList.length) {
          this.toShow = this.toShow.add(this.containers);
        }
        if (this.settings.success) {
          for (i = 0; this.successList[i]; i++) {
            this.showLabel(this.successList[i]);
          }
        }
        if (this.settings.unhighlight) {
          for (i = 0, elements = this.validElements(); elements[i]; i++) {
            this.settings.unhighlight.call(this, elements[i], this.settings.errorClass, this.settings.validClass);
          }
        }
        this.toHide = this.toHide.not(this.toShow);
        this.hideErrors();
        this.addWrapper(this.toShow).show();
      },

      validElements: function() {
        return this.currentElements.not(this.invalidElements());
      },

      invalidElements: function() {
        return $(this.errorList).map(function() {
          return this.element;
        });
      },

      showLabel: function(element, message) {
        var place, group, errorID, v,
          error = this.errorsFor(element),
          elementID = this.idOrName(element),
          describedBy = $(element).attr("aria-describedby");

        if (error.length) {

          // Refresh error/success class
          error.removeClass(this.settings.validClass).addClass(this.settings.errorClass);

          // Replace message on existing label
          error.html(message);
        } else {

          // Create error element
          error = $("<" + this.settings.errorElement + ">")
            .attr("id", elementID + "-error")
            .addClass(this.settings.errorClass)
            .html(message || "");

          // Maintain reference to the element to be placed into the DOM
          place = error;
          if (this.settings.wrapper) {

            // Make sure the element is visible, even in IE
            // actually showing the wrapped element is handled elsewhere
            place = error.hide().show().wrap("<" + this.settings.wrapper + "/>").parent();
          }
          if (this.labelContainer.length) {
            this.labelContainer.append(place);
          } else if (this.settings.errorPlacement) {
            this.settings.errorPlacement.call(this, place, $(element));
          } else {
            place.insertAfter(element);
          }

          // Link error back to the element
          if (error.is("label")) {

            // If the error is a label, then associate using 'for'
            error.attr("for", elementID);

            // If the element is not a child of an associated label, then it's necessary
            // to explicitly apply aria-describedby
          } else if (error.parents("label[for='" + this.escapeCssMeta(elementID) + "']").length === 0) {
            errorID = error.attr("id");

            // Respect existing non-error aria-describedby
            if (!describedBy) {
              describedBy = errorID;
            } else if (!describedBy.match(new RegExp("\\b" + this.escapeCssMeta(errorID) + "\\b"))) {

              // Add to end of list if not already present
              describedBy += " " + errorID;
            }
            $(element).attr("aria-describedby", describedBy);

            // If this element is grouped, then assign to all elements in the same group
            group = this.groups[element.name];
            if (group) {
              v = this;
              $.each(v.groups, function(name, testgroup) {
                if (testgroup === group) {
                  $("[name='" + v.escapeCssMeta(name) + "']", v.currentForm)
                    .attr("aria-describedby", error.attr("id"));
                }
              });
            }
          }
        }
        if (!message && this.settings.success) {
          error.text("");
          if (typeof this.settings.success === "string") {
            error.addClass(this.settings.success);
          } else {
            this.settings.success(error, element);
          }
        }
        this.toShow = this.toShow.add(error);
      },

      errorsFor: function(element) {
        var name = this.escapeCssMeta(this.idOrName(element)),
          describer = $(element).attr("aria-describedby"),
          selector = "label[for='" + name + "'], label[for='" + name + "'] *";

        // 'aria-describedby' should directly reference the error element
        if (describer) {
          selector = selector + ", #" + this.escapeCssMeta(describer)
            .replace(/\s+/g, ", #");
        }

        return this
          .errors()
          .filter(selector);
      },

      // See https://api.jquery.com/category/selectors/, for CSS
      // meta-characters that should be escaped in order to be used with JQuery
      // as a literal part of a name/id or any selector.
      escapeCssMeta: function(string) {
        return string.replace(/([\\!"#$%&'()*+,./:;<=>?@\[\]^`{|}~])/g, "\\$1");
      },

      idOrName: function(element) {
        return this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name);
      },

      validationTargetFor: function(element) {

        // If radio/checkbox, validate first element in group instead
        if (this.checkable(element)) {
          element = this.findByName(element.name);
        }

        // Always apply ignore filter
        return $(element).not(this.settings.ignore)[0];
      },

      checkable: function(element) {
        return (/radio|checkbox/i).test(element.type);
      },

      findByName: function(name) {
        return $(this.currentForm).find("[name='" + this.escapeCssMeta(name) + "']");
      },

      getLength: function(value, element) {
        switch (element.nodeName.toLowerCase()) {
          case "select":
            return $("option:selected", element).length;
          case "input":
            if (this.checkable(element)) {
              return this.findByName(element.name).filter(":checked").length;
            }
        }
        return value.length;
      },

      depend: function(param, element) {
        return this.dependTypes[typeof param] ? this.dependTypes[typeof param](param, element) : true;
      },

      dependTypes: {
        "boolean": function(param) {
          return param;
        },
        "string": function(param, element) {
          return !!$(param, element.form).length;
        },
        "function": function(param, element) {
          return param(element);
        }
      },

      optional: function(element) {
        var val = this.elementValue(element);
        return !$.validator.methods.required.call(this, val, element) && "dependency-mismatch";
      },

      startRequest: function(element) {
        if (!this.pending[element.name]) {
          this.pendingRequest++;
          $(element).addClass(this.settings.pendingClass);
          this.pending[element.name] = true;
        }
      },

      stopRequest: function(element, valid) {
        this.pendingRequest--;

        // Sometimes synchronization fails, make sure pendingRequest is never < 0
        if (this.pendingRequest < 0) {
          this.pendingRequest = 0;
        }
        delete this.pending[element.name];
        $(element).removeClass(this.settings.pendingClass);
        if (valid && this.pendingRequest === 0 && this.formSubmitted && this.form()) {
          $(this.currentForm).submit();
          this.formSubmitted = false;
        } else if (!valid && this.pendingRequest === 0 && this.formSubmitted) {
          $(this.currentForm).triggerHandler("invalid-form", [this]);
          this.formSubmitted = false;
        }
      },

      previousValue: function(element, method) {
        method = typeof method === "string" && method || "remote";

        return $.data(element, "previousValue") || $.data(element, "previousValue", {
          old: null,
          valid: true,
          message: this.defaultMessage(element, {
            method: method
          })
        });
      },

      // Cleans up all forms and elements, removes validator-specific events
      destroy: function() {
        this.resetForm();

        $(this.currentForm)
          .off(".validate")
          .removeData("validator")
          .find(".validate-equalTo-blur")
          .off(".validate-equalTo")
          .removeClass("validate-equalTo-blur");
      }

    },

    classRuleSettings: {
      required: {
        required: true
      },
      email: {
        email: true
      },
      url: {
        url: true
      },
      date: {
        date: true
      },
      dateISO: {
        dateISO: true
      },
      number: {
        number: true
      },
      digits: {
        digits: true
      },
      creditcard: {
        creditcard: true
      }
    },

    addClassRules: function(className, rules) {
      if (className.constructor === String) {
        this.classRuleSettings[className] = rules;
      } else {
        $.extend(this.classRuleSettings, className);
      }
    },

    classRules: function(element) {
      var rules = {},
        classes = $(element).attr("class");

      if (classes) {
        $.each(classes.split(" "), function() {
          if (this in $.validator.classRuleSettings) {
            $.extend(rules, $.validator.classRuleSettings[this]);
          }
        });
      }
      return rules;
    },

    normalizeAttributeRule: function(rules, type, method, value) {

      // Convert the value to a number for number inputs, and for text for backwards compability
      // allows type="date" and others to be compared as strings
      if (/min|max|step/.test(method) && (type === null || /number|range|text/.test(type))) {
        value = Number(value);

        // Support Opera Mini, which returns NaN for undefined minlength
        if (isNaN(value)) {
          value = undefined;
        }
      }

      if (value || value === 0) {
        rules[method] = value;
      } else if (type === method && type !== "range") {

        // Exception: the jquery validate 'range' method
        // does not test for the html5 'range' type
        rules[method] = true;
      }
    },

    attributeRules: function(element) {
      var rules = {},
        $element = $(element),
        type = element.getAttribute("type"),
        method, value;

      for (method in $.validator.methods) {

        // Support for <input required> in both html5 and older browsers
        if (method === "required") {
          value = element.getAttribute(method);

          // Some browsers return an empty string for the required attribute
          // and non-HTML5 browsers might have required="" markup
          if (value === "") {
            value = true;
          }

          // Force non-HTML5 browsers to return bool
          value = !!value;
        } else {
          value = $element.attr(method);
        }

        this.normalizeAttributeRule(rules, type, method, value);
      }

      // 'maxlength' may be returned as -1, 2147483647 ( IE ) and 524288 ( safari ) for text inputs
      if (rules.maxlength && /-1|2147483647|524288/.test(rules.maxlength)) {
        delete rules.maxlength;
      }

      return rules;
    },

    dataRules: function(element) {
      var rules = {},
        $element = $(element),
        type = element.getAttribute("type"),
        method, value;

      for (method in $.validator.methods) {
        value = $element.data("rule" + method.charAt(0).toUpperCase() + method.substring(1).toLowerCase());
        this.normalizeAttributeRule(rules, type, method, value);
      }
      return rules;
    },

    staticRules: function(element) {
      var rules = {},
        validator = $.data(element.form, "validator");

      if (validator.settings.rules) {
        rules = $.validator.normalizeRule(validator.settings.rules[element.name]) || {};
      }
      return rules;
    },

    normalizeRules: function(rules, element) {

      // Handle dependency check
      $.each(rules, function(prop, val) {

        // Ignore rule when param is explicitly false, eg. required:false
        if (val === false) {
          delete rules[prop];
          return;
        }
        if (val.param || val.depends) {
          var keepRule = true;
          switch (typeof val.depends) {
            case "string":
              keepRule = !!$(val.depends, element.form).length;
              break;
            case "function":
              keepRule = val.depends.call(element, element);
              break;
          }
          if (keepRule) {
            rules[prop] = val.param !== undefined ? val.param : true;
          } else {
            $.data(element.form, "validator").resetElements($(element));
            delete rules[prop];
          }
        }
      });

      // Evaluate parameters
      $.each(rules, function(rule, parameter) {
        rules[rule] = $.isFunction(parameter) && rule !== "normalizer" ? parameter(element) : parameter;
      });

      // Clean number parameters
      $.each(["minlength", "maxlength"], function() {
        if (rules[this]) {
          rules[this] = Number(rules[this]);
        }
      });
      $.each(["rangelength", "range"], function() {
        var parts;
        if (rules[this]) {
          if ($.isArray(rules[this])) {
            rules[this] = [Number(rules[this][0]), Number(rules[this][1])];
          } else if (typeof rules[this] === "string") {
            parts = rules[this].replace(/[\[\]]/g, "").split(/[\s,]+/);
            rules[this] = [Number(parts[0]), Number(parts[1])];
          }
        }
      });

      if ($.validator.autoCreateRanges) {

        // Auto-create ranges
        if (rules.min != null && rules.max != null) {
          rules.range = [rules.min, rules.max];
          delete rules.min;
          delete rules.max;
        }
        if (rules.minlength != null && rules.maxlength != null) {
          rules.rangelength = [rules.minlength, rules.maxlength];
          delete rules.minlength;
          delete rules.maxlength;
        }
      }

      return rules;
    },

    // Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
    normalizeRule: function(data) {
      if (typeof data === "string") {
        var transformed = {};
        $.each(data.split(/\s/), function() {
          transformed[this] = true;
        });
        data = transformed;
      }
      return data;
    },

    // http://jqueryvalidation.org/jQuery.validator.addMethod/
    addMethod: function(name, method, message) {
      $.validator.methods[name] = method;
      $.validator.messages[name] = message !== undefined ? message : $.validator.messages[name];
      if (method.length < 3) {
        $.validator.addClassRules(name, $.validator.normalizeRule(name));
      }
    },

    // http://jqueryvalidation.org/jQuery.validator.methods/
    methods: {

      // http://jqueryvalidation.org/required-method/
      required: function(value, element, param) {

        // Check if dependency is met
        if (!this.depend(param, element)) {
          return "dependency-mismatch";
        }
        if (element.nodeName.toLowerCase() === "select") {

          // Could be an array for select-multiple or a string, both are fine this way
          var val = $(element).val();
          return val && val.length > 0;
        }
        if (this.checkable(element)) {
          return this.getLength(value, element) > 0;
        }
        return value.length > 0;
      },

      // http://jqueryvalidation.org/email-method/
      email: function(value, element) {

        // From https://html.spec.whatwg.org/multipage/forms.html#valid-e-mail-address
        // Retrieved 2014-01-14
        // If you have a problem with this implementation, report a bug against the above spec
        // Or use custom methods to implement your own email validation
        return this.optional(element) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
      },

      // http://jqueryvalidation.org/url-method/
      url: function(value, element) {

        // Copyright (c) 2010-2013 Diego Perini, MIT licensed
        // https://gist.github.com/dperini/729294
        // see also https://mathiasbynens.be/demo/url-regex
        // modified to allow protocol-relative URLs
        return this.optional(element) || /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
      },

      // http://jqueryvalidation.org/date-method/
      date: function(value, element) {
        return this.optional(element) || !/Invalid|NaN/.test(new Date(value).toString());
      },

      // http://jqueryvalidation.org/dateISO-method/
      dateISO: function(value, element) {
        return this.optional(element) || /^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test(value);
      },

      // http://jqueryvalidation.org/number-method/
      number: function(value, element) {
        return this.optional(element) || /^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(value);
      },

      // http://jqueryvalidation.org/digits-method/
      digits: function(value, element) {
        return this.optional(element) || /^\d+$/.test(value);
      },

      // http://jqueryvalidation.org/minlength-method/
      minlength: function(value, element, param) {
        var length = $.isArray(value) ? value.length : this.getLength(value, element);
        return this.optional(element) || length >= param;
      },

      // http://jqueryvalidation.org/maxlength-method/
      maxlength: function(value, element, param) {
        var length = $.isArray(value) ? value.length : this.getLength(value, element);
        return this.optional(element) || length <= param;
      },

      // http://jqueryvalidation.org/rangelength-method/
      rangelength: function(value, element, param) {
        var length = $.isArray(value) ? value.length : this.getLength(value, element);
        return this.optional(element) || (length >= param[0] && length <= param[1]);
      },

      // http://jqueryvalidation.org/min-method/
      min: function(value, element, param) {
        return this.optional(element) || value >= param;
      },

      // http://jqueryvalidation.org/max-method/
      max: function(value, element, param) {
        return this.optional(element) || value <= param;
      },

      // http://jqueryvalidation.org/range-method/
      range: function(value, element, param) {
        return this.optional(element) || (value >= param[0] && value <= param[1]);
      },

      // http://jqueryvalidation.org/step-method/
      step: function(value, element, param) {
        var type = $(element).attr("type"),
          errorMessage = "Step attribute on input type " + type + " is not supported.",
          supportedTypes = ["text", "number", "range"],
          re = new RegExp("\\b" + type + "\\b"),
          notSupported = type && !re.test(supportedTypes.join()),
          decimalPlaces = function(num) {
            var match = ("" + num).match(/(?:\.(\d+))?$/);
            if (!match) {
              return 0;
            }

            // Number of digits right of decimal point.
            return match[1] ? match[1].length : 0;
          },
          toInt = function(num) {
            return Math.round(num * Math.pow(10, decimals));
          },
          valid = true,
          decimals;

        // Works only for text, number and range input types
        // TODO find a way to support input types date, datetime, datetime-local, month, time and week
        if (notSupported) {
          throw new Error(errorMessage);
        }

        decimals = decimalPlaces(param);

        // Value can't have too many decimals
        if (decimalPlaces(value) > decimals || toInt(value) % toInt(param) !== 0) {
          valid = false;
        }

        return this.optional(element) || valid;
      },

      // http://jqueryvalidation.org/equalTo-method/
      equalTo: function(value, element, param) {

        // Bind to the blur event of the target in order to revalidate whenever the target field is updated
        var target = $(param);
        if (this.settings.onfocusout && target.not(".validate-equalTo-blur").length) {
          target.addClass("validate-equalTo-blur").on("blur.validate-equalTo", function() {
            $(element).valid();
          });
        }
        return value === target.val();
      },

      // http://jqueryvalidation.org/remote-method/
      remote: function(value, element, param, method) {
        if (this.optional(element)) {
          return "dependency-mismatch";
        }

        method = typeof method === "string" && method || "remote";

        var previous = this.previousValue(element, method),
          validator, data, optionDataString;

        if (!this.settings.messages[element.name]) {
          this.settings.messages[element.name] = {};
        }
        previous.originalMessage = previous.originalMessage || this.settings.messages[element.name][method];
        this.settings.messages[element.name][method] = previous.message;

        param = typeof param === "string" && {
          url: param
        } || param;
        optionDataString = $.param($.extend({
          data: value
        }, param.data));
        if (previous.old === optionDataString) {
          return previous.valid;
        }

        previous.old = optionDataString;
        validator = this;
        this.startRequest(element);
        data = {};
        data[element.name] = value;
        $.ajax($.extend(true, {
          mode: "abort",
          port: "validate" + element.name,
          dataType: "json",
          data: data,
          context: validator.currentForm,
          success: function(response) {
            var valid = response === true || response === "true",
              errors, message, submitted;

            validator.settings.messages[element.name][method] = previous.originalMessage;
            if (valid) {
              submitted = validator.formSubmitted;
              validator.resetInternals();
              validator.toHide = validator.errorsFor(element);
              validator.formSubmitted = submitted;
              validator.successList.push(element);
              validator.invalid[element.name] = false;
              validator.showErrors();
            } else {
              errors = {};
              message = response || validator.defaultMessage(element, {
                method: method,
                parameters: value
              });
              errors[element.name] = previous.message = message;
              validator.invalid[element.name] = true;
              validator.showErrors(errors);
            }
            previous.valid = valid;
            validator.stopRequest(element, valid);
          }
        }, param));
        return "pending";
      }
    }

  });

  // Ajax mode: abort
  // usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
  // if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort()

  var pendingRequests = {},
    ajax;

  // Use a prefilter if available (1.5+)
  if ($.ajaxPrefilter) {
    $.ajaxPrefilter(function(settings, _, xhr) {
      var port = settings.port;
      if (settings.mode === "abort") {
        if (pendingRequests[port]) {
          pendingRequests[port].abort();
        }
        pendingRequests[port] = xhr;
      }
    });
  } else {

    // Proxy ajax
    ajax = $.ajax;
    $.ajax = function(settings) {
      var mode = ("mode" in settings ? settings : $.ajaxSettings).mode,
        port = ("port" in settings ? settings : $.ajaxSettings).port;
      if (mode === "abort") {
        if (pendingRequests[port]) {
          pendingRequests[port].abort();
        }
        pendingRequests[port] = ajax.apply(this, arguments);
        return pendingRequests[port];
      }
      return ajax.apply(this, arguments);
    };
  }
  return $;
}));
/*!
 * jQuery Validation Plugin v1.16.0
 *
 * http://jqueryvalidation.org/
 *
 * Copyright (c) 2016 Jörn Zaefferer
 * Released under the MIT license
 */
(function(factory) {
  if (typeof define === "function" && define.amd) {
    define(["jquery", "./jquery.validate"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("jquery"));
  } else {
    factory(jQuery);
  }
}(function($) {

  (function() {

    function stripHtml(value) {

      // Remove html tags and space chars
      return value.replace(/<.[^<>]*?>/g, " ").replace(/&nbsp;|&#160;/gi, " ")

        // Remove punctuation
        .replace(/[.(),;:!?%#$'\"_+=\/\-“”’]*/g, "");
    }

    $.validator.addMethod("maxWords", function(value, element, params) {
      return this.optional(element) || stripHtml(value).match(/\b\w+\b/g).length <= params;
    }, $.validator.format("Please enter {0} words or less."));

    $.validator.addMethod("minWords", function(value, element, params) {
      return this.optional(element) || stripHtml(value).match(/\b\w+\b/g).length >= params;
    }, $.validator.format("Please enter at least {0} words."));

    $.validator.addMethod("rangeWords", function(value, element, params) {
      var valueStripped = stripHtml(value),
        regex = /\b\w+\b/g;
      return this.optional(element) || valueStripped.match(regex).length >= params[0] && valueStripped.match(regex).length <= params[1];
    }, $.validator.format("Please enter between {0} and {1} words."));

  }());

  // Accept a value from a file input based on a required mimetype
  $.validator.addMethod("accept", function(value, element, param) {

    // Split mime on commas in case we have multiple types we can accept
    var typeParam = typeof param === "string" ? param.replace(/\s/g, "") : "image/*",
      optionalValue = this.optional(element),
      i, file, regex;

    // Element is optional
    if (optionalValue) {
      return optionalValue;
    }

    if ($(element).attr("type") === "file") {

      // Escape string to be used in the regex
      // see: http://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
      // Escape also "/*" as "/.*" as a wildcard
      typeParam = typeParam
        .replace(/[\-\[\]\/\{\}\(\)\+\?\.\\\^\$\|]/g, "\\$&")
        .replace(/,/g, "|")
        .replace(/\/\*/g, "/.*");

      // Check if the element has a FileList before checking each file
      if (element.files && element.files.length) {
        regex = new RegExp(".?(" + typeParam + ")$", "i");
        for (i = 0; i < element.files.length; i++) {
          file = element.files[i];

          // Grab the mimetype from the loaded file, verify it matches
          if (!file.type.match(regex)) {
            return false;
          }
        }
      }
    }

    // Either return true because we've validated each file, or because the
    // browser does not support element.files and the FileList feature
    return true;
  }, $.validator.format("Please enter a value with a valid mimetype."));

  $.validator.addMethod("alphanumeric", function(value, element) {
    return this.optional(element) || /^\w+$/i.test(value);
  }, "Letters, numbers, and underscores only please");

  /*
   * Dutch bank account numbers (not 'giro' numbers) have 9 digits
   * and pass the '11 check'.
   * We accept the notation with spaces, as that is common.
   * acceptable: 123456789 or 12 34 56 789
   */
  $.validator.addMethod("bankaccountNL", function(value, element) {
    if (this.optional(element)) {
      return true;
    }
    if (!(/^[0-9]{9}|([0-9]{2} ){3}[0-9]{3}$/.test(value))) {
      return false;
    }

    // Now '11 check'
    var account = value.replace(/ /g, ""), // Remove spaces
      sum = 0,
      len = account.length,
      pos, factor, digit;
    for (pos = 0; pos < len; pos++) {
      factor = len - pos;
      digit = account.substring(pos, pos + 1);
      sum = sum + factor * digit;
    }
    return sum % 11 === 0;
  }, "Please specify a valid bank account number");

  $.validator.addMethod("bankorgiroaccountNL", function(value, element) {
    return this.optional(element) ||
      ($.validator.methods.bankaccountNL.call(this, value, element)) ||
      ($.validator.methods.giroaccountNL.call(this, value, element));
  }, "Please specify a valid bank or giro account number");

  /**
   * BIC is the business identifier code (ISO 9362). This BIC check is not a guarantee for authenticity.
   *
   * BIC pattern: BBBBCCLLbbb (8 or 11 characters long; bbb is optional)
   *
   * Validation is case-insensitive. Please make sure to normalize input yourself.
   *
   * BIC definition in detail:
   * - First 4 characters - bank code (only letters)
   * - Next 2 characters - ISO 3166-1 alpha-2 country code (only letters)
   * - Next 2 characters - location code (letters and digits)
   *   a. shall not start with '0' or '1'
   *   b. second character must be a letter ('O' is not allowed) or digit ('0' for test (therefore not allowed), '1' denoting passive participant, '2' typically reverse-billing)
   * - Last 3 characters - branch code, optional (shall not start with 'X' except in case of 'XXX' for primary office) (letters and digits)
   */
  $.validator.addMethod("bic", function(value, element) {
    return this.optional(element) || /^([A-Z]{6}[A-Z2-9][A-NP-Z1-9])(X{3}|[A-WY-Z0-9][A-Z0-9]{2})?$/.test(value.toUpperCase());
  }, "Please specify a valid BIC code");

  /*
   * Código de identificación fiscal ( CIF ) is the tax identification code for Spanish legal entities
   * Further rules can be found in Spanish on http://es.wikipedia.org/wiki/C%C3%B3digo_de_identificaci%C3%B3n_fiscal
   *
   * Spanish CIF structure:
   *
   * [ T ][ P ][ P ][ N ][ N ][ N ][ N ][ N ][ C ]
   *
   * Where:
   *
   * T: 1 character. Kind of Organization Letter: [ABCDEFGHJKLMNPQRSUVW]
   * P: 2 characters. Province.
   * N: 5 characters. Secuencial Number within the province.
   * C: 1 character. Control Digit: [0-9A-J].
   *
   * [ T ]: Kind of Organizations. Possible values:
   *
   *   A. Corporations
   *   B. LLCs
   *   C. General partnerships
   *   D. Companies limited partnerships
   *   E. Communities of goods
   *   F. Cooperative Societies
   *   G. Associations
   *   H. Communities of homeowners in horizontal property regime
   *   J. Civil Societies
   *   K. Old format
   *   L. Old format
   *   M. Old format
   *   N. Nonresident entities
   *   P. Local authorities
   *   Q. Autonomous bodies, state or not, and the like, and congregations and religious institutions
   *   R. Congregations and religious institutions (since 2008 ORDER EHA/451/2008)
   *   S. Organs of State Administration and regions
   *   V. Agrarian Transformation
   *   W. Permanent establishments of non-resident in Spain
   *
   * [ C ]: Control Digit. It can be a number or a letter depending on T value:
   * [ T ]  -->  [ C ]
   * ------    ----------
   *   A         Number
   *   B         Number
   *   E         Number
   *   H         Number
   *   K         Letter
   *   P         Letter
   *   Q         Letter
   *   S         Letter
   *
   */
  $.validator.addMethod("cifES", function(value) {
    "use strict";

    var cifRegEx = new RegExp(/^([ABCDEFGHJKLMNPQRSUVW])(\d{7})([0-9A-J])$/gi);
    var letter = value.substring(0, 1), // [ T ]
      number = value.substring(1, 8), // [ P ][ P ][ N ][ N ][ N ][ N ][ N ]
      control = value.substring(8, 9), // [ C ]
      all_sum = 0,
      even_sum = 0,
      odd_sum = 0,
      i, n,
      control_digit,
      control_letter;

    function isOdd(n) {
      return n % 2 === 0;
    }

    // Quick format test
    if (value.length !== 9 || !cifRegEx.test(value)) {
      return false;
    }

    for (i = 0; i < number.length; i++) {
      n = parseInt(number[i], 10);

      // Odd positions
      if (isOdd(i)) {

        // Odd positions are multiplied first.
        n *= 2;

        // If the multiplication is bigger than 10 we need to adjust
        odd_sum += n < 10 ? n : n - 9;

        // Even positions
        // Just sum them
      } else {
        even_sum += n;
      }
    }

    all_sum = even_sum + odd_sum;
    control_digit = (10 - (all_sum).toString().substr(-1)).toString();
    control_digit = parseInt(control_digit, 10) > 9 ? "0" : control_digit;
    control_letter = "JABCDEFGHI".substr(control_digit, 1).toString();

    // Control must be a digit
    if (letter.match(/[ABEH]/)) {
      return control === control_digit;

      // Control must be a letter
    } else if (letter.match(/[KPQS]/)) {
      return control === control_letter;

      // Can be either
    } else {
      return control === control_digit || control === control_letter;
    }

    return false;

  }, "Please specify a valid CIF number.");

  /*
   * Brazillian CPF number (Cadastrado de Pessoas Físicas) is the equivalent of a Brazilian tax registration number.
   * CPF numbers have 11 digits in total: 9 numbers followed by 2 check numbers that are being used for validation.
   */
  $.validator.addMethod("cpfBR", function(value) {

    // Removing special characters from value
    value = value.replace(/([~!@#$%^&*()_+=`{}\[\]\-|\\:;'<>,.\/? ])+/g, "");

    // Checking value to have 11 digits only
    if (value.length !== 11) {
      return false;
    }

    var sum = 0,
      firstCN, secondCN, checkResult, i;

    firstCN = parseInt(value.substring(9, 10), 10);
    secondCN = parseInt(value.substring(10, 11), 10);

    checkResult = function(sum, cn) {
      var result = (sum * 10) % 11;
      if ((result === 10) || (result === 11)) {
        result = 0;
      }
      return (result === cn);
    };

    // Checking for dump data
    if (value === "" ||
      value === "00000000000" ||
      value === "11111111111" ||
      value === "22222222222" ||
      value === "33333333333" ||
      value === "44444444444" ||
      value === "55555555555" ||
      value === "66666666666" ||
      value === "77777777777" ||
      value === "88888888888" ||
      value === "99999999999"
    ) {
      return false;
    }

    // Step 1 - using first Check Number:
    for (i = 1; i <= 9; i++) {
      sum = sum + parseInt(value.substring(i - 1, i), 10) * (11 - i);
    }

    // If first Check Number (CN) is valid, move to Step 2 - using second Check Number:
    if (checkResult(sum, firstCN)) {
      sum = 0;
      for (i = 1; i <= 10; i++) {
        sum = sum + parseInt(value.substring(i - 1, i), 10) * (12 - i);
      }
      return checkResult(sum, secondCN);
    }
    return false;

  }, "Please specify a valid CPF number");

  // http://jqueryvalidation.org/creditcard-method/
  // based on http://en.wikipedia.org/wiki/Luhn_algorithm
  $.validator.addMethod("creditcard", function(value, element) {
    if (this.optional(element)) {
      return "dependency-mismatch";
    }

    // Accept only spaces, digits and dashes
    if (/[^0-9 \-]+/.test(value)) {
      return false;
    }

    var nCheck = 0,
      nDigit = 0,
      bEven = false,
      n, cDigit;

    value = value.replace(/\D/g, "");

    // Basing min and max length on
    // http://developer.ean.com/general_info/Valid_Credit_Card_Types
    if (value.length < 13 || value.length > 19) {
      return false;
    }

    for (n = value.length - 1; n >= 0; n--) {
      cDigit = value.charAt(n);
      nDigit = parseInt(cDigit, 10);
      if (bEven) {
        if ((nDigit *= 2) > 9) {
          nDigit -= 9;
        }
      }

      nCheck += nDigit;
      bEven = !bEven;
    }

    return (nCheck % 10) === 0;
  }, "Please enter a valid credit card number.");

  /* NOTICE: Modified version of Castle.Components.Validator.CreditCardValidator
   * Redistributed under the the Apache License 2.0 at http://www.apache.org/licenses/LICENSE-2.0
   * Valid Types: mastercard, visa, amex, dinersclub, enroute, discover, jcb, unknown, all (overrides all other settings)
   */
  $.validator.addMethod("creditcardtypes", function(value, element, param) {
    if (/[^0-9\-]+/.test(value)) {
      return false;
    }

    value = value.replace(/\D/g, "");

    var validTypes = 0x0000;

    if (param.mastercard) {
      validTypes |= 0x0001;
    }
    if (param.visa) {
      validTypes |= 0x0002;
    }
    if (param.amex) {
      validTypes |= 0x0004;
    }
    if (param.dinersclub) {
      validTypes |= 0x0008;
    }
    if (param.enroute) {
      validTypes |= 0x0010;
    }
    if (param.discover) {
      validTypes |= 0x0020;
    }
    if (param.jcb) {
      validTypes |= 0x0040;
    }
    if (param.unknown) {
      validTypes |= 0x0080;
    }
    if (param.all) {
      validTypes = 0x0001 | 0x0002 | 0x0004 | 0x0008 | 0x0010 | 0x0020 | 0x0040 | 0x0080;
    }
    if (validTypes & 0x0001 && /^(5[12345])/.test(value)) { // Mastercard
      return value.length === 16;
    }
    if (validTypes & 0x0002 && /^(4)/.test(value)) { // Visa
      return value.length === 16;
    }
    if (validTypes & 0x0004 && /^(3[47])/.test(value)) { // Amex
      return value.length === 15;
    }
    if (validTypes & 0x0008 && /^(3(0[012345]|[68]))/.test(value)) { // Dinersclub
      return value.length === 14;
    }
    if (validTypes & 0x0010 && /^(2(014|149))/.test(value)) { // Enroute
      return value.length === 15;
    }
    if (validTypes & 0x0020 && /^(6011)/.test(value)) { // Discover
      return value.length === 16;
    }
    if (validTypes & 0x0040 && /^(3)/.test(value)) { // Jcb
      return value.length === 16;
    }
    if (validTypes & 0x0040 && /^(2131|1800)/.test(value)) { // Jcb
      return value.length === 15;
    }
    if (validTypes & 0x0080) { // Unknown
      return true;
    }
    return false;
  }, "Please enter a valid credit card number.");

  /**
   * Validates currencies with any given symbols by @jameslouiz
   * Symbols can be optional or required. Symbols required by default
   *
   * Usage examples:
   *  currency: ["£", false] - Use false for soft currency validation
   *  currency: ["$", false]
   *  currency: ["RM", false] - also works with text based symbols such as "RM" - Malaysia Ringgit etc
   *
   *  <input class="currencyInput" name="currencyInput">
   *
   * Soft symbol checking
   *  currencyInput: {
   *     currency: ["$", false]
   *  }
   *
   * Strict symbol checking (default)
   *  currencyInput: {
   *     currency: "$"
   *     //OR
   *     currency: ["$", true]
   *  }
   *
   * Multiple Symbols
   *  currencyInput: {
   *     currency: "$,£,¢"
   *  }
   */
  $.validator.addMethod("currency", function(value, element, param) {
    var isParamString = typeof param === "string",
      symbol = isParamString ? param : param[0],
      soft = isParamString ? true : param[1],
      regex;

    symbol = symbol.replace(/,/g, "");
    symbol = soft ? symbol + "]" : symbol + "]?";
    regex = "^[" + symbol + "([1-9]{1}[0-9]{0,2}(\\,[0-9]{3})*(\\.[0-9]{0,2})?|[1-9]{1}[0-9]{0,}(\\.[0-9]{0,2})?|0(\\.[0-9]{0,2})?|(\\.[0-9]{1,2})?)$";
    regex = new RegExp(regex);
    return this.optional(element) || regex.test(value);

  }, "Please specify a valid currency");

  $.validator.addMethod("dateFA", function(value, element) {
    return this.optional(element) || /^[1-4]\d{3}\/((0?[1-6]\/((3[0-1])|([1-2][0-9])|(0?[1-9])))|((1[0-2]|(0?[7-9]))\/(30|([1-2][0-9])|(0?[1-9]))))$/.test(value);
  }, $.validator.messages.date);

  /**
   * Return true, if the value is a valid date, also making this formal check dd/mm/yyyy.
   *
   * @example $.validator.methods.date("01/01/1900")
   * @result true
   *
   * @example $.validator.methods.date("01/13/1990")
   * @result false
   *
   * @example $.validator.methods.date("01.01.1900")
   * @result false
   *
   * @example <input name="pippo" class="{dateITA:true}" />
   * @desc Declares an optional input element whose value must be a valid date.
   *
   * @name $.validator.methods.dateITA
   * @type Boolean
   * @cat Plugins/Validate/Methods
   */
  $.validator.addMethod("dateITA", function(value, element) {
    var check = false,
      re = /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      adata, gg, mm, aaaa, xdata;
    if (re.test(value)) {
      adata = value.split("/");
      gg = parseInt(adata[0], 10);
      mm = parseInt(adata[1], 10);
      aaaa = parseInt(adata[2], 10);
      xdata = new Date(Date.UTC(aaaa, mm - 1, gg, 12, 0, 0, 0));
      if ((xdata.getUTCFullYear() === aaaa) && (xdata.getUTCMonth() === mm - 1) && (xdata.getUTCDate() === gg)) {
        check = true;
      } else {
        check = false;
      }
    } else {
      check = false;
    }
    return this.optional(element) || check;
  }, $.validator.messages.date);

  $.validator.addMethod("dateNL", function(value, element) {
    return this.optional(element) || /^(0?[1-9]|[12]\d|3[01])[\.\/\-](0?[1-9]|1[012])[\.\/\-]([12]\d)?(\d\d)$/.test(value);
  }, $.validator.messages.date);

  // Older "accept" file extension method. Old docs: http://docs.jquery.com/Plugins/Validation/Methods/accept
  $.validator.addMethod("extension", function(value, element, param) {
    param = typeof param === "string" ? param.replace(/,/g, "|") : "png|jpe?g|gif";
    return this.optional(element) || value.match(new RegExp("\\.(" + param + ")$", "i"));
  }, $.validator.format("Please enter a value with a valid extension."));

  /**
   * Dutch giro account numbers (not bank numbers) have max 7 digits
   */
  $.validator.addMethod("giroaccountNL", function(value, element) {
    return this.optional(element) || /^[0-9]{1,7}$/.test(value);
  }, "Please specify a valid giro account number");

  /**
   * IBAN is the international bank account number.
   * It has a country - specific format, that is checked here too
   *
   * Validation is case-insensitive. Please make sure to normalize input yourself.
   */
  $.validator.addMethod("iban", function(value, element) {

    // Some quick simple tests to prevent needless work
    if (this.optional(element)) {
      return true;
    }

    // Remove spaces and to upper case
    var iban = value.replace(/ /g, "").toUpperCase(),
      ibancheckdigits = "",
      leadingZeroes = true,
      cRest = "",
      cOperator = "",
      countrycode, ibancheck, charAt, cChar, bbanpattern, bbancountrypatterns, ibanregexp, i, p;

    // Check for IBAN code length.
    // It contains:
    // country code ISO 3166-1 - two letters,
    // two check digits,
    // Basic Bank Account Number (BBAN) - up to 30 chars
    var minimalIBANlength = 5;
    if (iban.length < minimalIBANlength) {
      return false;
    }

    // Check the country code and find the country specific format
    countrycode = iban.substring(0, 2);
    bbancountrypatterns = {
      "AL": "\\d{8}[\\dA-Z]{16}",
      "AD": "\\d{8}[\\dA-Z]{12}",
      "AT": "\\d{16}",
      "AZ": "[\\dA-Z]{4}\\d{20}",
      "BE": "\\d{12}",
      "BH": "[A-Z]{4}[\\dA-Z]{14}",
      "BA": "\\d{16}",
      "BR": "\\d{23}[A-Z][\\dA-Z]",
      "BG": "[A-Z]{4}\\d{6}[\\dA-Z]{8}",
      "CR": "\\d{17}",
      "HR": "\\d{17}",
      "CY": "\\d{8}[\\dA-Z]{16}",
      "CZ": "\\d{20}",
      "DK": "\\d{14}",
      "DO": "[A-Z]{4}\\d{20}",
      "EE": "\\d{16}",
      "FO": "\\d{14}",
      "FI": "\\d{14}",
      "FR": "\\d{10}[\\dA-Z]{11}\\d{2}",
      "GE": "[\\dA-Z]{2}\\d{16}",
      "DE": "\\d{18}",
      "GI": "[A-Z]{4}[\\dA-Z]{15}",
      "GR": "\\d{7}[\\dA-Z]{16}",
      "GL": "\\d{14}",
      "GT": "[\\dA-Z]{4}[\\dA-Z]{20}",
      "HU": "\\d{24}",
      "IS": "\\d{22}",
      "IE": "[\\dA-Z]{4}\\d{14}",
      "IL": "\\d{19}",
      "IT": "[A-Z]\\d{10}[\\dA-Z]{12}",
      "KZ": "\\d{3}[\\dA-Z]{13}",
      "KW": "[A-Z]{4}[\\dA-Z]{22}",
      "LV": "[A-Z]{4}[\\dA-Z]{13}",
      "LB": "\\d{4}[\\dA-Z]{20}",
      "LI": "\\d{5}[\\dA-Z]{12}",
      "LT": "\\d{16}",
      "LU": "\\d{3}[\\dA-Z]{13}",
      "MK": "\\d{3}[\\dA-Z]{10}\\d{2}",
      "MT": "[A-Z]{4}\\d{5}[\\dA-Z]{18}",
      "MR": "\\d{23}",
      "MU": "[A-Z]{4}\\d{19}[A-Z]{3}",
      "MC": "\\d{10}[\\dA-Z]{11}\\d{2}",
      "MD": "[\\dA-Z]{2}\\d{18}",
      "ME": "\\d{18}",
      "NL": "[A-Z]{4}\\d{10}",
      "NO": "\\d{11}",
      "PK": "[\\dA-Z]{4}\\d{16}",
      "PS": "[\\dA-Z]{4}\\d{21}",
      "PL": "\\d{24}",
      "PT": "\\d{21}",
      "RO": "[A-Z]{4}[\\dA-Z]{16}",
      "SM": "[A-Z]\\d{10}[\\dA-Z]{12}",
      "SA": "\\d{2}[\\dA-Z]{18}",
      "RS": "\\d{18}",
      "SK": "\\d{20}",
      "SI": "\\d{15}",
      "ES": "\\d{20}",
      "SE": "\\d{20}",
      "CH": "\\d{5}[\\dA-Z]{12}",
      "TN": "\\d{20}",
      "TR": "\\d{5}[\\dA-Z]{17}",
      "AE": "\\d{3}\\d{16}",
      "GB": "[A-Z]{4}\\d{14}",
      "VG": "[\\dA-Z]{4}\\d{16}"
    };

    bbanpattern = bbancountrypatterns[countrycode];

    // As new countries will start using IBAN in the
    // future, we only check if the countrycode is known.
    // This prevents false negatives, while almost all
    // false positives introduced by this, will be caught
    // by the checksum validation below anyway.
    // Strict checking should return FALSE for unknown
    // countries.
    if (typeof bbanpattern !== "undefined") {
      ibanregexp = new RegExp("^[A-Z]{2}\\d{2}" + bbanpattern + "$", "");
      if (!(ibanregexp.test(iban))) {
        return false; // Invalid country specific format
      }
    }

    // Now check the checksum, first convert to digits
    ibancheck = iban.substring(4, iban.length) + iban.substring(0, 4);
    for (i = 0; i < ibancheck.length; i++) {
      charAt = ibancheck.charAt(i);
      if (charAt !== "0") {
        leadingZeroes = false;
      }
      if (!leadingZeroes) {
        ibancheckdigits += "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(charAt);
      }
    }

    // Calculate the result of: ibancheckdigits % 97
    for (p = 0; p < ibancheckdigits.length; p++) {
      cChar = ibancheckdigits.charAt(p);
      cOperator = "" + cRest + "" + cChar;
      cRest = cOperator % 97;
    }
    return cRest === 1;
  }, "Please specify a valid IBAN");

  $.validator.addMethod("integer", function(value, element) {
    return this.optional(element) || /^-?\d+$/.test(value);
  }, "A positive or negative non-decimal number please");

  $.validator.addMethod("ipv4", function(value, element) {
    return this.optional(element) || /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/i.test(value);
  }, "Please enter a valid IP v4 address.");

  $.validator.addMethod("ipv6", function(value, element) {
    return this.optional(element) || /^((([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){6}:[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){5}:([0-9A-Fa-f]{1,4}:)?[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){4}:([0-9A-Fa-f]{1,4}:){0,2}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){3}:([0-9A-Fa-f]{1,4}:){0,3}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){2}:([0-9A-Fa-f]{1,4}:){0,4}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){6}((\b((25[0-5])|(1\d{2})|(2[0-4]\d)|(\d{1,2}))\b)\.){3}(\b((25[0-5])|(1\d{2})|(2[0-4]\d)|(\d{1,2}))\b))|(([0-9A-Fa-f]{1,4}:){0,5}:((\b((25[0-5])|(1\d{2})|(2[0-4]\d)|(\d{1,2}))\b)\.){3}(\b((25[0-5])|(1\d{2})|(2[0-4]\d)|(\d{1,2}))\b))|(::([0-9A-Fa-f]{1,4}:){0,5}((\b((25[0-5])|(1\d{2})|(2[0-4]\d)|(\d{1,2}))\b)\.){3}(\b((25[0-5])|(1\d{2})|(2[0-4]\d)|(\d{1,2}))\b))|([0-9A-Fa-f]{1,4}::([0-9A-Fa-f]{1,4}:){0,5}[0-9A-Fa-f]{1,4})|(::([0-9A-Fa-f]{1,4}:){0,6}[0-9A-Fa-f]{1,4})|(([0-9A-Fa-f]{1,4}:){1,7}:))$/i.test(value);
  }, "Please enter a valid IP v6 address.");

  $.validator.addMethod("lettersonly", function(value, element) {
    return this.optional(element) || /^[a-z]+$/i.test(value);
  }, "Letters only please");

  $.validator.addMethod("letterswithbasicpunc", function(value, element) {
    return this.optional(element) || /^[a-z\-.,()'"\s]+$/i.test(value);
  }, "Letters or punctuation only please");

  $.validator.addMethod("mobileNL", function(value, element) {
    return this.optional(element) || /^((\+|00(\s|\s?\-\s?)?)31(\s|\s?\-\s?)?(\(0\)[\-\s]?)?|0)6((\s|\s?\-\s?)?[0-9]){8}$/.test(value);
  }, "Please specify a valid mobile number");

  /* For UK phone functions, do the following server side processing:
   * Compare original input with this RegEx pattern:
   * ^\(?(?:(?:00\)?[\s\-]?\(?|\+)(44)\)?[\s\-]?\(?(?:0\)?[\s\-]?\(?)?|0)([1-9]\d{1,4}\)?[\s\d\-]+)$
   * Extract $1 and set $prefix to '+44<space>' if $1 is '44', otherwise set $prefix to '0'
   * Extract $2 and remove hyphens, spaces and parentheses. Phone number is combined $prefix and $2.
   * A number of very detailed GB telephone number RegEx patterns can also be found at:
   * http://www.aa-asterisk.org.uk/index.php/Regular_Expressions_for_Validating_and_Formatting_GB_Telephone_Numbers
   */
  $.validator.addMethod("mobileUK", function(phone_number, element) {
    phone_number = phone_number.replace(/\(|\)|\s+|-/g, "");
    return this.optional(element) || phone_number.length > 9 &&
      phone_number.match(/^(?:(?:(?:00\s?|\+)44\s?|0)7(?:[1345789]\d{2}|624)\s?\d{3}\s?\d{3})$/);
  }, "Please specify a valid mobile number");

  /*
   * The NIE (Número de Identificación de Extranjero) is a Spanish tax identification number assigned by the Spanish
   * authorities to any foreigner.
   *
   * The NIE is the equivalent of a Spaniards Número de Identificación Fiscal (NIF) which serves as a fiscal
   * identification number. The CIF number (Certificado de Identificación Fiscal) is equivalent to the NIF, but applies to
   * companies rather than individuals. The NIE consists of an 'X' or 'Y' followed by 7 or 8 digits then another letter.
   */
  $.validator.addMethod("nieES", function(value) {
    "use strict";

    var nieRegEx = new RegExp(/^[MXYZ]{1}[0-9]{7,8}[TRWAGMYFPDXBNJZSQVHLCKET]{1}$/gi);
    var validChars = "TRWAGMYFPDXBNJZSQVHLCKET",
      letter = value.substr(value.length - 1).toUpperCase(),
      number;

    value = value.toString().toUpperCase();

    // Quick format test
    if (value.length > 10 || value.length < 9 || !nieRegEx.test(value)) {
      return false;
    }

    // X means same number
    // Y means number + 10000000
    // Z means number + 20000000
    value = value.replace(/^[X]/, "0")
      .replace(/^[Y]/, "1")
      .replace(/^[Z]/, "2");

    number = value.length === 9 ? value.substr(0, 8) : value.substr(0, 9);

    return validChars.charAt(parseInt(number, 10) % 23) === letter;

  }, "Please specify a valid NIE number.");

  /*
   * The Número de Identificación Fiscal ( NIF ) is the way tax identification used in Spain for individuals
   */
  $.validator.addMethod("nifES", function(value) {
    "use strict";

    value = value.toUpperCase();

    // Basic format test
    if (!value.match("((^[A-Z]{1}[0-9]{7}[A-Z0-9]{1}$|^[T]{1}[A-Z0-9]{8}$)|^[0-9]{8}[A-Z]{1}$)")) {
      return false;
    }

    // Test NIF
    if (/^[0-9]{8}[A-Z]{1}$/.test(value)) {
      return ("TRWAGMYFPDXBNJZSQVHLCKE".charAt(value.substring(8, 0) % 23) === value.charAt(8));
    }

    // Test specials NIF (starts with K, L or M)
    if (/^[KLM]{1}/.test(value)) {
      return (value[8] === String.fromCharCode(64));
    }

    return false;

  }, "Please specify a valid NIF number.");

  $.validator.addMethod("notEqualTo", function(value, element, param) {
    return this.optional(element) || !$.validator.methods.equalTo.call(this, value, element, param);
  }, "Please enter a different value, values must not be the same.");

  $.validator.addMethod("nowhitespace", function(value, element) {
    return this.optional(element) || /^\S+$/i.test(value);
  }, "No white space please");

  /**
   * Return true if the field value matches the given format RegExp
   *
   * @example $.validator.methods.pattern("AR1004",element,/^AR\d{4}$/)
   * @result true
   *
   * @example $.validator.methods.pattern("BR1004",element,/^AR\d{4}$/)
   * @result false
   *
   * @name $.validator.methods.pattern
   * @type Boolean
   * @cat Plugins/Validate/Methods
   */
  $.validator.addMethod("pattern", function(value, element, param) {
    if (this.optional(element)) {
      return true;
    }
    if (typeof param === "string") {
      param = new RegExp("^(?:" + param + ")$");
    }
    return param.test(value);
  }, "Invalid format.");

  /**
   * Dutch phone numbers have 10 digits (or 11 and start with +31).
   */
  $.validator.addMethod("phoneNL", function(value, element) {
    return this.optional(element) || /^((\+|00(\s|\s?\-\s?)?)31(\s|\s?\-\s?)?(\(0\)[\-\s]?)?|0)[1-9]((\s|\s?\-\s?)?[0-9]){8}$/.test(value);
  }, "Please specify a valid phone number.");

  /* For UK phone functions, do the following server side processing:
   * Compare original input with this RegEx pattern:
   * ^\(?(?:(?:00\)?[\s\-]?\(?|\+)(44)\)?[\s\-]?\(?(?:0\)?[\s\-]?\(?)?|0)([1-9]\d{1,4}\)?[\s\d\-]+)$
   * Extract $1 and set $prefix to '+44<space>' if $1 is '44', otherwise set $prefix to '0'
   * Extract $2 and remove hyphens, spaces and parentheses. Phone number is combined $prefix and $2.
   * A number of very detailed GB telephone number RegEx patterns can also be found at:
   * http://www.aa-asterisk.org.uk/index.php/Regular_Expressions_for_Validating_and_Formatting_GB_Telephone_Numbers
   */
  $.validator.addMethod("phoneUK", function(phone_number, element) {
    phone_number = phone_number.replace(/\(|\)|\s+|-/g, "");
    return this.optional(element) || phone_number.length > 9 &&
      phone_number.match(/^(?:(?:(?:00\s?|\+)44\s?)|(?:\(?0))(?:\d{2}\)?\s?\d{4}\s?\d{4}|\d{3}\)?\s?\d{3}\s?\d{3,4}|\d{4}\)?\s?(?:\d{5}|\d{3}\s?\d{3})|\d{5}\)?\s?\d{4,5})$/);
  }, "Please specify a valid phone number");

  /**
   * Matches US phone number format
   *
   * where the area code may not start with 1 and the prefix may not start with 1
   * allows '-' or ' ' as a separator and allows parens around area code
   * some people may want to put a '1' in front of their number
   *
   * 1(212)-999-2345 or
   * 212 999 2344 or
   * 212-999-0983
   *
   * but not
   * 111-123-5434
   * and not
   * 212 123 4567
   */
  $.validator.addMethod("phoneUS", function(phone_number, element) {
    phone_number = phone_number.replace(/\s+/g, "");
    return this.optional(element) || phone_number.length > 9 &&
      phone_number.match(/^(\+?1-?)?(\([2-9]([02-9]\d|1[02-9])\)|[2-9]([02-9]\d|1[02-9]))-?[2-9]([02-9]\d|1[02-9])-?\d{4}$/);
  }, "Please specify a valid phone number");

  /* For UK phone functions, do the following server side processing:
   * Compare original input with this RegEx pattern:
   * ^\(?(?:(?:00\)?[\s\-]?\(?|\+)(44)\)?[\s\-]?\(?(?:0\)?[\s\-]?\(?)?|0)([1-9]\d{1,4}\)?[\s\d\-]+)$
   * Extract $1 and set $prefix to '+44<space>' if $1 is '44', otherwise set $prefix to '0'
   * Extract $2 and remove hyphens, spaces and parentheses. Phone number is combined $prefix and $2.
   * A number of very detailed GB telephone number RegEx patterns can also be found at:
   * http://www.aa-asterisk.org.uk/index.php/Regular_Expressions_for_Validating_and_Formatting_GB_Telephone_Numbers
   */

  // Matches UK landline + mobile, accepting only 01-3 for landline or 07 for mobile to exclude many premium numbers
  $.validator.addMethod("phonesUK", function(phone_number, element) {
    phone_number = phone_number.replace(/\(|\)|\s+|-/g, "");
    return this.optional(element) || phone_number.length > 9 &&
      phone_number.match(/^(?:(?:(?:00\s?|\+)44\s?|0)(?:1\d{8,9}|[23]\d{9}|7(?:[1345789]\d{8}|624\d{6})))$/);
  }, "Please specify a valid uk phone number");

  /**
   * Matches a valid Canadian Postal Code
   *
   * @example jQuery.validator.methods.postalCodeCA( "H0H 0H0", element )
   * @result true
   *
   * @example jQuery.validator.methods.postalCodeCA( "H0H0H0", element )
   * @result false
   *
   * @name jQuery.validator.methods.postalCodeCA
   * @type Boolean
   * @cat Plugins/Validate/Methods
   */
  $.validator.addMethod("postalCodeCA", function(value, element) {
    return this.optional(element) || /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ] *\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i.test(value);
  }, "Please specify a valid postal code");

  /*
   * Valida CEPs do brasileiros:
   *
   * Formatos aceitos:
   * 99999-999
   * 99.999-999
   * 99999999
   */
  $.validator.addMethod("postalcodeBR", function(cep_value, element) {
    return this.optional(element) || /^\d{2}.\d{3}-\d{3}?$|^\d{5}-?\d{3}?$/.test(cep_value);
  }, "Informe um CEP válido.");

  /* Matches Italian postcode (CAP) */
  $.validator.addMethod("postalcodeIT", function(value, element) {
    return this.optional(element) || /^\d{5}$/.test(value);
  }, "Please specify a valid postal code");

  $.validator.addMethod("postalcodeNL", function(value, element) {
    return this.optional(element) || /^[1-9][0-9]{3}\s?[a-zA-Z]{2}$/.test(value);
  }, "Please specify a valid postal code");

  // Matches UK postcode. Does not match to UK Channel Islands that have their own postcodes (non standard UK)
  $.validator.addMethod("postcodeUK", function(value, element) {
    return this.optional(element) || /^((([A-PR-UWYZ][0-9])|([A-PR-UWYZ][0-9][0-9])|([A-PR-UWYZ][A-HK-Y][0-9])|([A-PR-UWYZ][A-HK-Y][0-9][0-9])|([A-PR-UWYZ][0-9][A-HJKSTUW])|([A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRVWXY]))\s?([0-9][ABD-HJLNP-UW-Z]{2})|(GIR)\s?(0AA))$/i.test(value);
  }, "Please specify a valid UK postcode");

  /*
   * Lets you say "at least X inputs that match selector Y must be filled."
   *
   * The end result is that neither of these inputs:
   *
   *	<input class="productinfo" name="partnumber">
   *	<input class="productinfo" name="description">
   *
   *	...will validate unless at least one of them is filled.
   *
   * partnumber:	{require_from_group: [1,".productinfo"]},
   * description: {require_from_group: [1,".productinfo"]}
   *
   * options[0]: number of fields that must be filled in the group
   * options[1]: CSS selector that defines the group of conditionally required fields
   */
  $.validator.addMethod("require_from_group", function(value, element, options) {
    var $fields = $(options[1], element.form),
      $fieldsFirst = $fields.eq(0),
      validator = $fieldsFirst.data("valid_req_grp") ? $fieldsFirst.data("valid_req_grp") : $.extend({}, this),
      isValid = $fields.filter(function() {
        return validator.elementValue(this);
      }).length >= options[0];

    // Store the cloned validator for future validation
    $fieldsFirst.data("valid_req_grp", validator);

    // If element isn't being validated, run each require_from_group field's validation rules
    if (!$(element).data("being_validated")) {
      $fields.data("being_validated", true);
      $fields.each(function() {
        validator.element(this);
      });
      $fields.data("being_validated", false);
    }
    return isValid;
  }, $.validator.format("Please fill at least {0} of these fields."));

  /*
   * Lets you say "either at least X inputs that match selector Y must be filled,
   * OR they must all be skipped (left blank)."
   *
   * The end result, is that none of these inputs:
   *
   *	<input class="productinfo" name="partnumber">
   *	<input class="productinfo" name="description">
   *	<input class="productinfo" name="color">
   *
   *	...will validate unless either at least two of them are filled,
   *	OR none of them are.
   *
   * partnumber:	{skip_or_fill_minimum: [2,".productinfo"]},
   * description: {skip_or_fill_minimum: [2,".productinfo"]},
   * color:		{skip_or_fill_minimum: [2,".productinfo"]}
   *
   * options[0]: number of fields that must be filled in the group
   * options[1]: CSS selector that defines the group of conditionally required fields
   *
   */
  $.validator.addMethod("skip_or_fill_minimum", function(value, element, options) {
    var $fields = $(options[1], element.form),
      $fieldsFirst = $fields.eq(0),
      validator = $fieldsFirst.data("valid_skip") ? $fieldsFirst.data("valid_skip") : $.extend({}, this),
      numberFilled = $fields.filter(function() {
        return validator.elementValue(this);
      }).length,
      isValid = numberFilled === 0 || numberFilled >= options[0];

    // Store the cloned validator for future validation
    $fieldsFirst.data("valid_skip", validator);

    // If element isn't being validated, run each skip_or_fill_minimum field's validation rules
    if (!$(element).data("being_validated")) {
      $fields.data("being_validated", true);
      $fields.each(function() {
        validator.element(this);
      });
      $fields.data("being_validated", false);
    }
    return isValid;
  }, $.validator.format("Please either skip these fields or fill at least {0} of them."));

  /* Validates US States and/or Territories by @jdforsythe
   * Can be case insensitive or require capitalization - default is case insensitive
   * Can include US Territories or not - default does not
   * Can include US Military postal abbreviations (AA, AE, AP) - default does not
   *
   * Note: "States" always includes DC (District of Colombia)
   *
   * Usage examples:
   *
   *  This is the default - case insensitive, no territories, no military zones
   *  stateInput: {
   *     caseSensitive: false,
   *     includeTerritories: false,
   *     includeMilitary: false
   *  }
   *
   *  Only allow capital letters, no territories, no military zones
   *  stateInput: {
   *     caseSensitive: false
   *  }
   *
   *  Case insensitive, include territories but not military zones
   *  stateInput: {
   *     includeTerritories: true
   *  }
   *
   *  Only allow capital letters, include territories and military zones
   *  stateInput: {
   *     caseSensitive: true,
   *     includeTerritories: true,
   *     includeMilitary: true
   *  }
   *
   */
  $.validator.addMethod("stateUS", function(value, element, options) {
    var isDefault = typeof options === "undefined",
      caseSensitive = (isDefault || typeof options.caseSensitive === "undefined") ? false : options.caseSensitive,
      includeTerritories = (isDefault || typeof options.includeTerritories === "undefined") ? false : options.includeTerritories,
      includeMilitary = (isDefault || typeof options.includeMilitary === "undefined") ? false : options.includeMilitary,
      regex;

    if (!includeTerritories && !includeMilitary) {
      regex = "^(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])$";
    } else if (includeTerritories && includeMilitary) {
      regex = "^(A[AEKLPRSZ]|C[AOT]|D[CE]|FL|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEINOPST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$";
    } else if (includeTerritories) {
      regex = "^(A[KLRSZ]|C[AOT]|D[CE]|FL|G[AU]|HI|I[ADLN]|K[SY]|LA|M[ADEINOPST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$";
    } else {
      regex = "^(A[AEKLPRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])$";
    }

    regex = caseSensitive ? new RegExp(regex) : new RegExp(regex, "i");
    return this.optional(element) || regex.test(value);
  }, "Please specify a valid state");

  // TODO check if value starts with <, otherwise don't try stripping anything
  $.validator.addMethod("strippedminlength", function(value, element, param) {
    return $(value).text().length >= param;
  }, $.validator.format("Please enter at least {0} characters"));

  $.validator.addMethod("time", function(value, element) {
    return this.optional(element) || /^([01]\d|2[0-3]|[0-9])(:[0-5]\d){1,2}$/.test(value);
  }, "Please enter a valid time, between 00:00 and 23:59");

  $.validator.addMethod("time12h", function(value, element) {
    return this.optional(element) || /^((0?[1-9]|1[012])(:[0-5]\d){1,2}(\ ?[AP]M))$/i.test(value);
  }, "Please enter a valid time in 12-hour am/pm format");

  // Same as url, but TLD is optional
  $.validator.addMethod("url2", function(value, element) {
    return this.optional(element) || /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)*(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
  }, $.validator.messages.url);

  /**
   * Return true, if the value is a valid vehicle identification number (VIN).
   *
   * Works with all kind of text inputs.
   *
   * @example <input type="text" size="20" name="VehicleID" class="{required:true,vinUS:true}" />
   * @desc Declares a required input element whose value must be a valid vehicle identification number.
   *
   * @name $.validator.methods.vinUS
   * @type Boolean
   * @cat Plugins/Validate/Methods
   */
  $.validator.addMethod("vinUS", function(v) {
    if (v.length !== 17) {
      return false;
    }

    var LL = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
      VL = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 7, 9, 2, 3, 4, 5, 6, 7, 8, 9],
      FL = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2],
      rs = 0,
      i, n, d, f, cd, cdv;

    for (i = 0; i < 17; i++) {
      f = FL[i];
      d = v.slice(i, i + 1);
      if (i === 8) {
        cdv = d;
      }
      if (!isNaN(d)) {
        d *= f;
      } else {
        for (n = 0; n < LL.length; n++) {
          if (d.toUpperCase() === LL[n]) {
            d = VL[n];
            d *= f;
            if (isNaN(cdv) && n === 8) {
              cdv = LL[n];
            }
            break;
          }
        }
      }
      rs += d;
    }
    cd = rs % 11;
    if (cd === 10) {
      cd = "X";
    }
    if (cd === cdv) {
      return true;
    }
    return false;
  }, "The specified vehicle identification number (VIN) is invalid.");

  $.validator.addMethod("zipcodeUS", function(value, element) {
    return this.optional(element) || /^\d{5}(-\d{4})?$/.test(value);
  }, "The specified US ZIP Code is invalid");

  $.validator.addMethod("ziprange", function(value, element) {
    return this.optional(element) || /^90[2-5]\d\{2\}-\d{4}$/.test(value);
  }, "Your ZIP-code must be in the range 902xx-xxxx to 905xx-xxxx");
  return $;
}));
//!     jQuery.rut.js
//		Permission is hereby granted, free of charge, to any person obtaining a copy
//		of this software and associated documentation files (the "Software"), to deal
//		in the Software without restriction, including without limitation the rights
//		to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//		copies of the Software, and to permit persons to whom the Software is
//		furnished to do so, subject to the following conditions:

//		The above copyright notice and this permission notice shall be included in
//		all copies or substantial portions of the Software.

//		THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//		IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//		FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//		AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//		LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//		OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//		THE SOFTWARE.

//		Para obtener este programa bajo otra licencia, póngase en
//		contacto con @pablomarambio en Twitter.
;
(function($) {
  var defaults = {
    validateOn: 'blur',
    formatOn: 'blur',
    ignoreControlKeys: true,
    useThousandsSeparator: true,
    minimumLength: 2
  };

  //private methods
  function clearFormat(value) {
    return value.replace(/[\.\-]/g, "");
  }

  function format(value, useThousandsSeparator) {
    var rutAndDv = splitRutAndDv(value);
    var cRut = rutAndDv[0];
    var cDv = rutAndDv[1];
    if (!(cRut && cDv)) {
      return cRut || value;
    }
    var rutF = "";
    var thousandsSeparator = useThousandsSeparator ? "." : "";
    while (cRut.length > 3) {
      rutF = thousandsSeparator + cRut.substr(cRut.length - 3) + rutF;
      cRut = cRut.substring(0, cRut.length - 3);
    }
    return cRut + rutF + "-" + cDv;
  }

  function isControlKey(e) {
    return e.type && e.type.match(/^key(up|down|press)/) &&
      (
        e.keyCode === 8 || // del
        e.keyCode === 16 || // shift
        e.keyCode === 17 || // ctrl
        e.keyCode === 18 || // alt
        e.keyCode === 20 || // caps lock
        e.keyCode === 27 || // esc
        e.keyCode === 37 || // arrow
        e.keyCode === 38 || // arrow
        e.keyCode === 39 || // arrow
        e.keyCode === 40 || // arrow
        e.keyCode === 91 // command
      );
  }

  function isValidRut(rut, options) {
    if (typeof(rut) !== 'string') {
      return false;
    }
    var cRut = clearFormat(rut);
    // validar por largo mínimo, sin guiones ni puntos:
    // x.xxx.xxx-x
    if (typeof options.minimumLength === 'boolean') {
      if (options.minimumLength && cRut.length < defaults.minimumLength) {
        return false;
      }
    } else {
      var minLength = parseInt(options.minimumLength, 10);
      if (cRut.length < minLength) {
        return false;
      }
    }
    var cDv = cRut.charAt(cRut.length - 1).toUpperCase();
    var nRut = parseInt(cRut.substr(0, cRut.length - 1));
    if (isNaN(nRut)) {
      return false;
    }
    return computeDv(nRut).toString().toUpperCase() === cDv;
  }

  function computeDv(rut) {
    var suma = 0;
    var mul = 2;
    if (typeof(rut) !== 'number') {
      return;
    }
    rut = rut.toString();
    for (var i = rut.length - 1; i >= 0; i--) {
      suma = suma + rut.charAt(i) * mul;
      mul = (mul + 1) % 8 || 2;
    }
    switch (suma % 11) {
      case 1:
        return 'k';
      case 0:
        return 0;
      default:
        return 11 - (suma % 11);
    }
  }

  function formatInput($input, useThousandsSeparator) {
    $input.val(format($input.val(), useThousandsSeparator));
  }

  function validateInput($input) {
    if (isValidRut($input.val(), $input.opts)) {
      $input.trigger('rutValido', splitRutAndDv($input.val()));
    } else {
      $input.trigger('rutInvalido');
    }
  }

  function splitRutAndDv(rut) {
    var cValue = clearFormat(rut);
    if (cValue.length === 0) {
      return [null, null];
    }
    if (cValue.length === 1) {
      return [cValue, null];
    }
    var cDv = cValue.charAt(cValue.length - 1);
    var cRut = cValue.substring(0, cValue.length - 1);
    return [cRut, cDv];
  }

  // public methods
  var methods = {
    init: function(options) {
      if (this.length > 1) {
        /* Valida multiples objetos a la vez */
        for (var i = 0; i < this.length; i++) {
          console.log(this[i]);
          $(this[i]).rut(options);
        }
      } else {
        var that = this;
        that.opts = $.extend({}, defaults, options);
        that.opts.formatOn && that.on(that.opts.formatOn, function(e) {
          if (that.opts.ignoreControlKeys && isControlKey(e)) {
            return;
          }
          formatInput(that, that.opts.useThousandsSeparator);
        });
        that.opts.validateOn && that.on(that.opts.validateOn, function() {
          validateInput(that);
        });
      }
      return this;
    }
  };

  $.fn.rut = function(methodOrOptions) {
    if (methods[methodOrOptions]) {
      return methods[methodOrOptions].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof methodOrOptions === 'object' || !methodOrOptions) {
      return methods.init.apply(this, arguments);
    } else {
      $.error("El método " + methodOrOptions + " no existe en jQuery.rut");
    }
  };

  $.formatRut = function(rut, useThousandsSeparator) {
    if (useThousandsSeparator === undefined) {
      useThousandsSeparator = true;
    }
    return format(rut, useThousandsSeparator);
  };

  $.computeDv = function(rut) {
    var cleanRut = clearFormat(rut);
    return computeDv(parseInt(cleanRut, 10));
  };

  $.validateRut = function(rut, fn, options) {
    options = options || {};
    if (isValidRut(rut, options)) {
      var rd = splitRutAndDv(rut);
      $.isFunction(fn) && fn(rd[0], rd[1]);
      return true;
    } else {
      return false;
    }
  };
})(jQuery);
(function($) {

  "use strict"

  $.fn.formulator = function(options) {

    var settings = $.extend({
      callback: function(data, textStatus, jqXHR) {}
    }, options);

    var constructor = function($form) {

      var $fields = $form.find('input, select, textarea');
      var $submit = $form.find('button[type="submit"], submit');

      var __formDisabled = function() {
        $submit.prop('disabled', true);
        $fields.change(function() {
          $submit.prop('disabled', false);
        });
      }

      // Validate Form

      var __formValidate = function() {

        if ($form.hasClass('form-validate')) {

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

      var __formAjax = function() {

        if ($form.hasClass('form-ajax')) {

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

      var __formReload = function() {

      }

      // Init
      __formDisabled();
      __formValidate();
      __formAjax();
      __formReload();

    }

    return this.each(function() {
      constructor($(this));
    });

  };

}(jQuery));