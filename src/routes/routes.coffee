util          = require 'util'
fs            = require 'fs'
phantomjs     = require 'phantomjs'
childProcess  = require 'child_process'
path          = require 'path'
http          = require 'http'
request       = require 'request'
_url          = require 'url'
cssParse      = require '../modules/css-parse/index'
cssunminifier = require 'cssunminifier'
_             = require 'lodash'
formidable    = require 'formidable'
_when         = require 'when'
htmlParse     = require 'html-parser'

######################################################
# Util
######################################################

STRING_CAMELIZE_REGEXP = /(\-|_|\.|\s)+(.)?/g
ELEMENT_REGEXP = /^[a-zA-Z]|\s(?=[a-zA-Z])/g

util = 

  camelize: (str) ->
    str.replace(STRING_CAMELIZE_REGEXP, (match, separator, chr) ->
      (if chr then chr.toUpperCase() else '')
    ).replace /^([A-Z])/, (match, separator, chr) ->
      match.toLowerCase()

  specificityScore: (selector) ->
    count =
      id: selector.match(/#/g)
      class: selector.match(/\./g)
      attr: selector.split('[')
      element: selector.match(ELEMENT_REGEXP)
      child: selector.split('>')
    _.forEach count, (value, key) ->
      count[key] = if value then value.length else 0
    count.id * 100 + count.class * 10 + count.attr * 10 + count.element * 1

  fontSizeToPx: (value) ->
    raw = parseFloat value, 10
    if value.match(/px$/) then return raw
    if value.match(/em$/) then return raw * 16  
    if value.match(/%$/) then return raw * .16
    switch value
      when 'inherit'
        return 16
      when 'xx-small'
        return 9
      when 'x-small'
        return 10
      when 'small'
        return 13
      when 'medium'
        return 16
      when 'large'
        return 18
      when 'x-large'
        return 24
      when 'xx-large'
        return 32
      when 'small'
        return 13
      when 'larger'
        return 19
      else
        return 1024

  toRelative: (items) ->
    itemsToCompare = _.filter items, (item) ->
      item.value isnt 'auto' and not item.value.match(/%$/)
    itemsToCompare = _.map itemsToCompare, (item) ->
      raw = parseFloat item.value, 10
      raw = if item.value.match(/(em|rem)$/g) then raw * 16 else raw
    max = _.max itemsToCompare
    _.forEach items, (item) ->
      raw = parseFloat item.value, 10
      if item.value is '0' then item.relativeValue = raw
      if item.value is 'auto' then item.relativeValue = 100
      if item.value.match(/%$/g) then item.relativeValue = raw
      if item.value.match(/(em|rem)$/g) then item.relativeValue = ((raw * 16) / max * 100)
      if item.value.match(/px$/g) then item.relativeValue = (raw / max * 100)

  getFileName: (url) ->
    try 
      url.match(/\/([^\/]+\.css)/)[1]
    catch e
      url

  getRequestInfo: (url, size) ->
    _when.promise (resolve, reject, notify) ->
      req = request url: url, encoding: 'utf8', (error, response, body) ->
        if not error and response.statusCode is 200
          resolve 
            url: url
            size: size
            body: body
            name: util.getFileName(url)
        else
          reject error

  getUrlContents: (url) ->
    _when.promise (resolve, reject, notify) ->
      req = request url: url, encoding: 'utf8', (error, response, body) ->
        if not error and response.statusCode is 200
          resolve body
        else
          reject error

  parseCssFromLink: (url) ->
    _when.promise (resolve, reject, notify) ->
      util.getUrlContents(url).then (body) ->
        resolve util.parseCss(body)
      , (err) ->
        reject err

  getUrlsFromLink: (url) ->
    _when.promise (resolve, reject, notify) ->
      childArgs = [
        path.join __dirname, '../phantomjs/get-subrequests.coffee'
        url
      ]

      childProcess.execFile phantomjs.path, childArgs, (error, stdout, stderr) ->
        if not error
          resolve JSON.parse stdout
        else
          reject stderr

  parseCssFromUrl: (url) ->
    _when.promise (resolve, reject, notify) ->
      util.getUrlsFromLink(url).then (infos) ->
        cssInfos = infos.css
        parsedUrl = _url.parse url
        cssRequests = []

        _.forEach cssInfos, (cssInfo) ->
          cssUrl = cssInfo.url
          if not cssUrl.match(/^(http|https)/g)
            if cssUrl.match(/^\/[^\/]/g)
              cssUrl = parsedUrl.href + cssUrl.replace(/^\//g, '')
            else if cssUrl.match(/^\/\//g)
              cssUrl = 'http:' + cssUrl
            else
              cssUrl = parsedUrl.href + cssUrl

          cssRequests.push util.getRequestInfo(cssUrl, cssInfo.size)
        
        _when.all(cssRequests).then (requests) ->
          css = ''

          _.forEach requests, (request, i) ->
            css += request.body
            delete requests[i].body

          data = util.parseCss(css)

          data.requests = requests
          data.js = requests: infos.js

          resolve data

  parseCss: (cssString) ->
    cssRules = cssParse cssunminifier.unminify(cssString)
    guid = 0

    css =
      rules: []
      selectors: []
      decs: []
      decsByProperty:
        all:
          ids: []
        unique:
          ids: []

    _.forEach cssRules.stylesheet.rules, (rule) ->
      newRule =
        selectors: []
        declarations: []
      if rule.selectors
        _.forEach rule.selectors, (selector) ->
          selectorId = guid++
          item = 
            id: selectorId
            string: selector
            score: util.specificityScore selector
          css.selectors.push item
          newRule.selectors.push selector
      if rule.declarations
        _.forEach rule.declarations, (dec) ->
          delete dec.type
          declarationId = dec.id = guid++
          if dec.value
            {property} = dec
            # Check for shorthand properties
            shorthand = property.match /^(margin|padding)/g
            if shorthand then property = shorthand[0]
            # Push the declaration
            css.decs.push dec
            # Check to see if this property has been added yet
            camelizedProperty = util.camelize property
            if not css.decsByProperty.all[camelizedProperty]
              css.decsByProperty.all[camelizedProperty] = []
            # Convert the font-size to px
            if dec.property is 'font-size'
              dec.pxValue = util.fontSizeToPx dec.value
            # Push the declaration by type
            css.decsByProperty.all.ids.push declarationId
            css.decsByProperty.all[camelizedProperty].push declarationId
            newRule.declarations.push declarationId
        if rule.selectors and rule.declarations
          css.rules.push newRule

    _.forEach css.decsByProperty.all, (ids, property) ->
      decs = _.filter css.decs, (dec) ->
        ids.indexOf(dec.id) isnt -1
      unique = _.unique decs, (dec) ->
        dec.value
      css.decsByProperty.unique[property] = _.map unique, (dec) ->
        css.decsByProperty.unique.ids.push dec.id
        dec.id

     # Relative values
    (relative = () ->
      all = css.decsByProperty.all
      _.forEach ['margin', 'padding', 'width', 'height'], (property) ->
        util.toRelative _.map all[property], (id) -> _.find css.decs, { id: id }
    )()

    response =
      counts:
        selectors: css.selectors.length
        uniqueDecs: _.keys(css.decsByProperty.unique).length
      rules: css.rules
      decs: css.decs
      decsByProperty:
        all: css.decsByProperty.all
        unique: css.decsByProperty.unique
      selectors: css.selectors  

######################################################
# Index
######################################################

exports.index = (req, res) ->
  res.render 'index'

######################################################
# API
######################################################

exports.api = {}

exports.api.parse =
  
  # POST
  post: (req, res) ->
    form = new formidable.IncomingForm()
    form.parse req, (err, fields, files) ->
      switch fields.type
        when 'input'
          res.send util.parseCss(fields.css)
        when 'link'
          util.parseCssFromLink(fields.url).then (response) ->
            res.send response
        when 'url'
          util.parseCssFromUrl(fields.url).then (response) ->
            res.send response
