/*global angular */
angular.module('rprtr').controller('TrendsCtrl', [
  '$scope',
  'history',
  function($scope, history) {
    'use strict';

    var historicRequests = history.getRequests(),
        l = historicRequests.length;

    /* Initiate our Data Array */
    $scope.trendData = [];

    /**
     * Make a timestamp readable to humans.
     *
     * @param {int} timeStamp
     * @return {string}
     */
    function niceTime(timeStamp) {
      var date = new Date(timeStamp).toUTCString();
      return date.substring(4, date.length - 4);
    }

    /**
     * Initiate the trendData array on our scope.
     *
     * @return {void}
     */
    function init() {
      /* For each chart ... */
      angular.forEach(chartConfigs, function(config, name) {
        $scope.trendData.push({
          name: name,
          data: {
            series: config.series,
            data: fetchDataFrom(config)
          }
        });
      });
    }

    /**
     * For every chartConfig object given, loop through the history
     * and accumulate our data.
     *
     * @param  {Object} config entry of chartConfigs
     * @return {Array}         all data found for the chart.
     */
    function fetchDataFrom(config) {
      var val = [], data = [];

      for (var i = 0; i < l; i++) {
        var request = historicRequests[i];

        try {
          /* Use the getter in config to fetch the data from request */
          val = config.get(request.data);
        } catch (e) {
          /* Fallback to 0 if we had any trouble, getting the values */
          for (var i2 = 0, l2 = config.series.length; i2 < l2; i2++) {
            val.push(0);
          }
        }

        /* Add data to list */
        data.push({
          x: niceTime(request.time),
          y: val
        });
      }

      return data;
    }

    /*
     * List of all the different charts, we want to see in
     * the overview.
     */
    var chartConfigs = {
      'Files': {
        series: ['CSS', 'JS'],
        get: function(data) {
          return [
            data.requests.length,
            data.js.requests.length
          ];
        }
      },
      'Total Request Size': {
        series: ['CSS', 'JS'],
        get: function(data) {
          return [
            $scope.getTotalRequestSize(data.requests),
            $scope.getTotalRequestSize(data.js.requests)
          ];
        }
      },
      'Font Sizes': {
        series: ['Declared', 'Unique'],
        get: function(data) {
          return [
            data.decsByProperty.all.fontSize.length,
            data.decsByProperty.unique.fontSize.length
          ];
        }
      },
      'Floats': {
        series: ['Floats'],
        get: function(data) {
          return [data.decsByProperty.all['float'].length];
        }
      },
      'Selectors': {
        series: ['Selectors'],
        get: function(data) {
          return [data.counts.selectors];
        }
      },
      'Dimensions': {
        series: ['Widths', 'Unq Widths', 'Heights', 'Unq Heights'],
        get: function(data) {
          var ret = [];
          angular.forEach(['width', 'height'], function(stat) {
            ret.push(data.decsByProperty.unique[stat].length);
            ret.push(data.decsByProperty.all[stat].length);
          });

          return ret;
        }
      },
      'Colors': {
        series: ['Colors', 'Unq Colors', 'BG Colors', 'Unq BG Colors'],
        get: function(data) {
          var ret = [];
          angular.forEach(['color', 'backgroundColor'], function(stat) {
            ret.push(data.decsByProperty.unique[stat].length);
            ret.push(data.decsByProperty.all[stat].length);
          });

          return ret;
        }
      }
    };

    init();
  }
]);
