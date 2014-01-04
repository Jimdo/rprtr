angular.module('rprtr').controller('GlobalCtrl', ['$scope', '$location', '$http', function ($scope, $location, $http) {
  
  var m = $scope.model = $scope.model || {};

  ///////////////////////////////////
  // CSS Parse
  ///////////////////////////////////

  m.cssInputTypes = [{
    label: 'URL',
    value: 'url'
  },{
    label: 'Link',
    value: 'link'
  },{
    label: 'Input',
    value: 'input'
  }];
  
  m.cssInputType = 'url';
  m.cssUrl = 'http://rprtr.herokuapp.com';
  m.cssLink = 'http://rprtr.herokuapp.com/css/i.css';
  m.cssInput = '';
  
  $scope.parseCss = function () {
    if (m.cssInputType === 'url') {
      $location.path('/site/url/' + encodeURIComponent(m.cssUrl));
    }
    if (m.cssInputType === 'link') {
      $location.path('/site/link/' + encodeURIComponent(m.cssLink));
    }
    if (m.cssInputType === 'input') {
      $http.post('/parse', { type: 'input', css: m.cssInput }).then(function (response) {
        $scope.site = response.data;
        $location.path('/results');
      });
    }
  };
  
  ///////////////////////////////////
  // Misc
  ///////////////////////////////////

  $scope.dropbarIsOpen = false;
  $scope.toggleDropbar = function () {
    $scope.dropbarIsOpen = !$scope.dropbarIsOpen;
  };

}]);

angular.module('rprtr').controller('ReportCtrl', ['$scope', '$routeParams', '$location', '$http', '$filter', 'history', function ($scope, $routeParams, $location, $http, $filter, history) {
  var m = $scope.model || {};

  m.d3 = {};

  $scope.trackHistory = history.toggle;

  $scope.chartType = 'line';

  $scope.chrtConfig = {
    labels: false,
    title: '',
    legend: {
      display: false,
      position: 'right'
    }
  };

  $http.post('/parse', { type: $routeParams.type, url: decodeURIComponent($routeParams.url) }).then(function (response) {
    
    history.add(response.data);

    $scope.site = response.data;

    angular.forEach(['width', 'height', 'color', 'backgroundColor'], function (stat) {
      m.d3[stat + 's'] = [
        { name: 'Unique', count: $scope.site.decsByProperty.unique[stat].length },
        { name: 'Total', count: $scope.site.decsByProperty.all[stat].length }
      ];
    });
    
  });

  ///////////////////////////////////
  // Subnav
  ///////////////////////////////////

  m.subNav = {
    items: [{
      id: 'overview',
      label: 'Overview',
      active: true
    },{
      id: 'requests',
      label: 'Requests'
    },{
      id: 'font-size',
      label: 'Font-Size'
    },{
      id: 'spacing',
      label: 'Spacing'
    },{
      id: 'width',
      label: 'Width'
    },{
      id: 'colors',
      label: 'Colors'
    },{
      id: 'all-rules',
      label: 'All Rules'
    },{
      id: 'selectors',
      label: 'Selectors'
    },{
      id: 'declarations',
      label: 'Declarations'
    },{
      id: 'trend',
      label: 'Trend'
    }]
  };

  m.subNav.active = $scope.model.subNav.items[0];
  $scope.subNavChange = function (newItem) {
    angular.forEach($scope.model.subNav.items, function (item) {
      item.active = false;
    });
    newItem.active = true;
    $scope.model.subNav.active = newItem;
  };

  ///////////////////////////////////
  // Utilities
  ///////////////////////////////////

  $scope.getDecs = function (ids) {
    if (ids) {
      return $filter('filter')($scope.site.decs, function (dec) {
        return ids.indexOf(dec.id) !== -1;
      });
    } else {
      return [];
    }
  };

  $scope.getSelectors = function (selectors) {
    return selectors.join(', ');
  };

  $scope.getTotalRequestSize = function (requests) {
    var totalSize = 0;
    angular.forEach(requests, function(request) {
      totalSize += request.size;
    });
    return totalSize;
  };
}]);