<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>jQuery Formulator</title>
	<link type="text/css" rel="stylesheet" href="./assets/css/sample.css">
	<script src="https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js"></script>
	<script src="./assets/js/sample.js"></script>
</head>
<body>

	<div class="section section-introduce">
		<div class="container">
			<div class="row">
				<div class="col-lg-12">
					<h1>jQuery Formulator</h1>
				</div>
			</div>
		</div>
	</div>

	<div class="section section-examples">
		<div class="container">
			<div class="row">
				<div class="col-lg-12">

					<h3>Examples</h3>
					
					<ul class="nav nav-tabs">
					  <li class="active"><a data-toggle="tab" href="#filer">Filter Reload</a></li>
					  <li><a data-toggle="tab" href="#validation">Only validation</a></li>
					  <li><a data-toggle="tab" href="#ajax">Only Ajax</a></li>
					  <li><a data-toggle="tab" href="#both">Validation & Ajax</a></li>
					  <li><a data-toggle="tab" href="#recaptcha">Google Recaptcha</a></li>
					</ul>

					<div class="tab-content">

						<!-- filter -->
						<div id="filer" class="example tab-pane active">
							<div class="row">
								<div class="col-lg-5">
									<!-- filter --> 
									<form id="form_3" class="form-reload">
										<div class="form-group">
											<label for="exampleSelect1">Countries</label>
											<select class="form-control" name="filter_countries" id="filter_countries">
												<option value="">Seleccione</option>
												<option value="chile">Chile</option>
												<option value="argentina">Argentina</option>
											</select>
										</div>
										<div class="form-group">
											<label for="exampleSelect1">Cities</label>
											<select class="form-control" name="filter_cities" id="filter_cities">
												<option value="">Select one</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
												<option value="3">4</option>
												<option value="5">5</option>
											</select>
										</div>
										<div class="form-group">
											<label for="exampleSelect1">Code</label>
											<select class="form-control" name="filter_code" id="filter_code">
												<option value="">Select one</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
												<option value="3">4</option>
												<option value="5">5</option>
											</select>
										</div>
									</form>
									<!-- //filter --> 
								</div>
							</div>
						</div>

						<!-- validation -->
						<div id="validation" class="example tab-pane">
							<div class="row">
								<div class="col-lg-5">
									<!-- validation --> 
									<form id="form_1" class="form-validate">
										<div class="form-group">
											<label for="exampleInputEmail1">Email address</label>
											<input type="email" class="form-control" id="exampleInputEmail1" name="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
											<small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
										</div>
										<div class="form-group">
											<label for="exampleInputPassword1">Password</label>
											<input type="password" class="form-control" id="exampleInputPassword1" name="exampleInputPassword1" placeholder="Password">
										</div>
										<div class="form-group">
											<label for="exampleSelect1">Example select</label>
											<select class="form-control" name="exampleSelect1" id="exampleSelect1">
												<option value="">Select one</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
												<option value="3">4</option>
												<option value="5">5</option>
											</select>
										</div>
										<div class="form-errors"></div>
										<button type="submit" class="btn btn-primary">Submit</button>
									</form>
									<!-- // validation --> 
								</div>
							</div>
						</div>

						<!-- ajax --> 
						<div id="ajax" class="example tab-pane">
							<div class="row">
								<div class="col-lg-5">
									<!-- ajax --> 
									<form id="form_2" class="form-ajax" action="./callback.json">
										<div class="form-group">
											<label for="exampleInputEmail1">Email address</label>
											<input type="email" class="form-control" id="exampleInputEmail1" name="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
											<small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
										</div>
										<div class="form-group">
											<label for="exampleInputPassword1">Password</label>
											<input type="password" class="form-control" id="exampleInputPassword1" name="exampleInputPassword1" placeholder="Password">
										</div>
										<div class="form-group">
											<label for="exampleSelect1">Example select</label>
											<select class="form-control" name="exampleSelect1" id="exampleSelect1">
												<option value="">Select one</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
												<option value="3">4</option>
												<option value="5">5</option>
											</select>
										</div>
										<button type="submit" class="btn btn-primary">Submit</button>
									</form>
									<!-- // ajax -->
								</div>
							</div>
						</div>

						<!-- both --> 

						<div id="both" class="example tab-pane">
							<div class="row">
								<div class="col-lg-5">
									<!-- both --> 
									<form id="form_3" class="form-validate form-ajax" action="./callback.json">
										<div class="form-group">
											<label for="exampleInputEmail1">Email address</label>
											<input type="email" class="form-control" id="exampleInputEmail1" name="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
											<small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
										</div>
										<div class="form-group">
											<label for="exampleInputPassword1">Password</label>
											<input type="password" class="form-control" id="exampleInputPassword1" name="exampleInputPassword1" placeholder="Password">
										</div>
										<div class="form-group">
											<label for="exampleSelect1">Example select</label>
											<select class="form-control" name="exampleSelect1" id="exampleSelect1">
												<option value="">Select one</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
												<option value="3">4</option>
												<option value="5">5</option>
											</select>
										</div>
										<div class="form-errors"></div>
										<button type="submit" class="btn btn-primary">Submit</button>
									</form>
									<!-- // both -->
								</div>
							</div>
						</div>

						<!-- Recaptcha -->

						<div id="recaptcha" class="example tab-pane">
							<div class="row">
								<div class="col-lg-5">
									<form id="form_3" class="form-validate form-ajax form-recaptcha" action="./callback.json">
										<div class="form-group">
											<label for="exampleInputEmail1">Email address</label>
											<input type="email" class="form-control" id="exampleInputEmail1" name="exampleInputEmail1" aria-describedby="emailHelp" placeholder="Enter email">
											<small id="emailHelp" class="form-text text-muted">We'll never share your email with anyone else.</small>
										</div>
										<div class="form-group">
											<label for="exampleInputPassword1">Password</label>
											<input type="password" class="form-control" id="exampleInputPassword1" name="exampleInputPassword1" placeholder="Password">
										</div>
										<div class="form-group">
											<label for="exampleSelect1">Example select</label>
											<select class="form-control" name="exampleSelect1" id="exampleSelect1">
												<option value="">Select one</option>
												<option value="1">1</option>
												<option value="2">2</option>
												<option value="3">3</option>
												<option value="3">4</option>
												<option value="5">5</option>
											</select>
										</div>
										<div class="form-errors"></div>
										<button type="submit" class="btn btn-primary">Submit</button>
									</form>
								</div>
							</div>
						</div>

						<!-- Recaptcha -->

					</div>
				</div>
			</div>
		</div>
	</div>

</body>
</html>