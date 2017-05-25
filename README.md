# jQuery Formulator

## Installation

#### Dependencies

* [jQuery Form](https://www.npmjs.com/package/jquery-form) npm i --save-dev jquery-form@4.2.0
* [jQuery Validation](https://www.npmjs.com/package/jquery-validation) npm i --save-dev jquery-validation@1.16.0
* [jQuery Rut](https://www.npmjs.com/package/jquery.rut) npm i --save-dev jquery.rut@1.1.2
* [Sweetalert](https://www.npmjs.com/package/sweetalert) npm i --save-dev sweetalert@1.1.3

#### NPM

```bash
npm install jquery-formulator --save-dev
```

#### Webpack

```js
require('jquery-formulator');
```

#### jQuery

```js
$(document).ready(function(){
  $('form').formulator();
});
```

#### HTML

##### Validation

You must add the class .form-validate

```html
<form action="" class="form-validate">
	...
	<input type="text" name="firstname">
</form>
```

Add this to show form errors

```html
<div class="form-errors"></div>
```

##### Ajax

You must add the class .form-ajax

```html
<form action="" class="form-ajax">
	...
	<input type="text" name="firstname">
</form>
```

##### Both

Example with *both* classes

```html
<form action="" class="form-ajax form-validate">
	...
	<input type="text" name="firstname">
</form>
```