module.exports =
  vendor_debug:
    src: [
      'src/client/vendor/jquery/jquery.js'
      'src/client/vendor/angular/angular.js'
      'src/client/vendor/d3/d3.js'
      'src/client/vendor/angular-charts/dist/angular-charts.js'
      'src/client/vendor/angular-route/angular-route.js'
      'src/client/vendor/ngstorage/ngstorage.js'
    ]
    dest: 'public/js/vendor.js'
  vendor_dist:
    src: [
      'src/client/vendor/jquery/jquery.min.js'
      'src/client/vendor/angular/angular.min.js'
      'src/client/vendor/d3/d3.min.js'
      'src/client/vendor/angular-charts/dist/angular-charts.min.js'
      'src/client/vendor/angular-route/angular-route.min.js'
      'src/client/vendor/ngstorage/ngstorage.min.js'
    ]
    dest: 'public/js/vendor.js'