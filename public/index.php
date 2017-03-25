<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<title>jQuery Formulator</title>
	<link type="text/css" rel="stylesheet" href="./assets/css/sample.css">
	<script src="./assets/js/sample.js"></script>
</head>
<body>
	<div class="container">
		<div class="row">
			<div id="formulator">
				<div class="formulator-container">
				
					<h1>jQuery Formulator</h1>

					<div class="example">
						<!-- validation --> 
						<h3>Only validation</h3>
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
									<option>1</option>
									<option>2</option>
									<option>3</option>
									<option>4</option>
									<option>5</option>
								</select>
							</div>
							<div class="form-errors"></div>
							<button type="submit" class="btn btn-primary">Submit</button>
						</form>
						<!-- // validation --> 
					</div>

					<div class="example">
					<!-- ajax --> 
						<h3>Only Ajax</h3>
						<form id="form_2" class="form-ajax">
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
									<option>1</option>
									<option>2</option>
									<option>3</option>
									<option>4</option>
									<option>5</option>
								</select>
							</div>
							<button type="submit" class="btn btn-primary">Submit</button>
						</form>
						<!-- // ajax -->
					</div>

					<div class="example">
						<!-- both --> 
						<h3>Validation & Ajax</h3>
						<form id="form_3" class="form-validate form-ajax">
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
									<option>1</option>
									<option>2</option>
									<option>3</option>
									<option>4</option>
									<option>5</option>
								</select>
							</div>
							<div class="form-errors"></div>
							<button type="submit" class="btn btn-primary">Submit</button>
						</form>
					<!-- // both -->
					</div>

					<div class="example">
						<!-- both --> 
						<h3>Filter Reload</h3>
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
									<option>1</option>
									<option>2</option>
									<option>3</option>
									<option>4</option>
									<option>5</option>
								</select>
							</div>
							<div class="form-group">
								<label for="exampleSelect1">Code</label>
								<select class="form-control" name="filter_code" id="filter_code">
									<option>1</option>
									<option>2</option>
									<option>3</option>
									<option>4</option>
									<option>5</option>
								</select>
							</div>
						</form>
					<!-- // both -->
					</div>




				</div>
			</div>
		</div>
	</div>
</body>
</html>