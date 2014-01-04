###
 # Get CSS and JS sub-requests from passed URL
 # 
 # In the future one should return the JS and CSS bodies instead of URLs
 # in order to speed things up by removing unnecessary requests
 # This isn't possible without hacks, jet
 # See https://github.com/ariya/phantomjs/issues/10158
 # 
 # @uses phantomjs
###

system = require 'system'
args = system.args

###*
 * All JavaScript resources
 * @type {Array}
###
js = []

###*
 * All CSS resources
 * @type {Array}
###
css = []

###*
 * Prevent resource duplicates in above variables
 * by adding and checking the URL with this array.
 * 
 * @type {Array}
###
allRecourceUrls = []


### Abort if the URL parameter is missing ###
if args.length <= 1
	system.stderr.writeLine "Missing URL argument."
	phantom.exit(1)

url = system.args[1]


### The Main page object. ###
page = require('webpage').create()

### Whenever we received a new resource... ###
page.onResourceReceived = (response) ->
	### Ensure we have a content type. ###
	return if not response.contentType

	### Eliminate duplicates. ###
	return if response.url in allRecourceUrls
	allRecourceUrls.push(response.url)

	### Generalize the content type. ###
	contentType = response.contentType.toLowerCase()

	### And add the URL and response size to the lists. ###
	if contentType.indexOf('javascript') >= 0 || contentType.indexOf('json') >= 0
		js.push url: response.url, size: response.bodySize

	if contentType.indexOf('css') >= 0
		css.push url: response.url, size: response.bodySize

### Open the passed URL and return the resource lists. ###
page.open url, (status) ->
	if status != 'success'
		system.stderr.writeLine "Could not load URL."
		phantom.exit(1)

	system.stdout.write JSON.stringify({css: css, js: js})
	phantom.exit();
