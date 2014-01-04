/**
 * History Service Provider
 *
 * Uses Local Storage to save older stats.
 * Provides them to compare services.
 * Can clean less important stats based on time.
 * @author <hannes.diercks@jimdo.com>
 */
/*global angular */
(function() {
  'use strict';

  /**
   * Verbose time intages.
   * @type {Number}
   */
  var fifeseconds = 5000,
      minute = fifeseconds * 12,
      hour = minute * 60,
      halfday = hour * 12,
      day = halfday * 2,
      week = day * 7,
      month = week * 4,
      jear = month * 12;

  /**
   * Factory for default storage settings per url
   *
   * @const
   */
  var DEFAULT_STORAGE = function() {
    return {
      trackToggle: { on: false },
      requests: [],
      lastCleaning: 0,
      autoClean: true,
      minList: 50,
      cleanInterval: hour / 2
    };
  };

  /**
   * The current time
   * @type {Date}
   */
  var aboutNow = new Date().getTime();

  /**
   * A Matrix to tell the shouldKeep function
   * which requests we'd like to keep
   *
   * Read: For the first breakpoint/bp/hour, keep an entry
   * from at most every interval/ivl/minute.
   *
   * @type {Array}
   */
  var keep = [
    {bp: minute, ivl: fifeseconds},
    {bp: hour, ivl: minute},
    {bp: day, ivl: hour},
    {bp: week, ivl: halfday},
    {bp: month, ivl: day},
    {bp: jear, ivl: week}
  ],
  unlimited = month,
  keeplength = keep.length;

  /**
   * Check if the time passed between the two given
   * timestamps in relation to the current time is
   * long enough to give the current timestamp a relevance.
   *
   * @param  {Number} current
   * @param  {Number} previous
   * @return {Boolean}
   */
  function shouldKeep(current, previous) {
    for (var i = 0; i < keeplength; i++) {
      var fitsInBreakpoint = (current > aboutNow - keep[i].bp),
          hasEnoughOffset = (current - keep[i].ivl >= previous);

      if (fitsInBreakpoint && hasEnoughOffset) {
        return true;
      } else if (current - unlimited >= previous) {
        /* Is meant to keep forever. */
        return true;
      }
    }

    return false;
  }

  /**
   * Loop through all requests and remove the irrelevant ones.
   *
   * @param  {Array} requests
   * @return {Array}
   */
  function cleanUp(history) {
    var last = 0,
        requests = history.requests,
        requestslength = requests.length,
        i = 0;

    /* We want to keep at leas two requests. */
    if (requests.length <= 2) {
      return;
    }

    /* Ensure we're working chronological. */
    requests.sort(function(a, b) {
      return a.time - b.time;
    });

    /* Remove outdated requests */
    history.requests = requests.filter(function(entry) {
      /* We always want to keep the latest */
      if (++i === requestslength) {
        return true;
      }

      if (shouldKeep(entry.time, last)) {
        last = entry.time;
        return true;
      }

      return false;
    });
  }

  /**
   * check if the data of two objects are the same.
   *
   * @param  {Object}  a
   * @param  {Object}  b
   * @return {Boolean}
   */
  function isSame(a, b) {
    return (JSON.stringify(a) === JSON.stringify(b));
  }

  /* The actual service */
  angular.module('rprtr').factory('history', [
    '$localStorage',
    '$routeParams',
    function($localStorage, $routeParams) {

      /**
       * Get the current url and build a local storage key from it
       * This way we have dedicated storage entries for each url
       * which is nice when we want to share or delete them.
       *
       * @type {String}
       */
      var historyKey = 'history-' + decodeURIComponent($routeParams.url)
            .replace(/http(s?):\/\//, '').replace(/[^a-zA-Z0-9]/g, '-');

      /* Get our previous entry or create a new one. */
      if (angular.isUndefined($localStorage[historyKey])) {
        $localStorage[historyKey] = DEFAULT_STORAGE();
      }

      /* Shorthands */
      var history = $localStorage[historyKey],
          toggle = history.trackToggle;

      /* Clean if we have to */
      if (toggle.on &&
        history.autoClean &&
        history.lastCleaning < aboutNow - history.cleanInterval
      ) {
        history.lastCleaning = aboutNow;
        cleanUp(history);
      }

      var requests = history.requests,
          requestLength = requests.length,
          latest = requestLength ? requests[requestLength - 1] : {};

      return {
        /**
         * Add a new dataset to the local storage.
         *
         * @param {Object} data
         */
        add: function(data) {
          if (toggle.on && !isSame(data, latest.data)) {
            var now = new Date().getTime();
            /* Add a new entry */
            requests.push({
              time: now,
              data: data
            });
          }
        },

        /**
         * Toggle history
         * The add function does not work when
         * toggle.on == false
         *
         * (Needs to be an object for angular bindings)
         *
         * @type {Object}
         */
        toggle: toggle,

        /**
         * Manualy trigger a cleanup run.
         *
         * @return {void}
         */
        clean: function() {
          cleanUp(history);
        },

        /**
         * Remove all requests but keep the general settings.
         *
         * @return {void}
         */
        reset: function() {
          history.requests = [];
        },

        /**
         * Get all the requests!
         *
         * @return {Array}
         */
        getRequests: function() {
          return requests;
        },

        getLatest: function() {
          return latest.data;
        }
      };
    }
  ]);
})();
