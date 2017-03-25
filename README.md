# jQuery Formulator v1.0.1

## Installation

#### Dependencies

* [jQuery Form](https://www.npmjs.com/package/jquery-form)
* [jQuery Validation](https://www.npmjs.com/package/jquery-validation)
* [jQuery Rut](https://www.npmjs.com/package/jquery.rut)
* [Sweetalert](https://www.npmjs.com/package/sweetalert)

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