var Experiment;
$(function () {

  Experiment = function (el, name, callback) {
    var that = {}, my = {};

    _.templateSettings.variable = 'experiment';

    my.el = el;
    my.codedName = name;
    my.name = name.replace(/[\W_]+/g, '-');
    my.encoded = encodeURIComponent(name);
    my.callback = callback;

    my.template = _.template($('#experiment-template').html());

    my.getData = function (callback) {
      var url = '/experiments/' + my.encoded + '.json?period=day';
      if (typeof kpi != 'undefined' && kpi !== false) {
        url += '&kpi=' + kpi;
      }
      
      var promise = $.getJSON(url);

      promise.done(function(data) {
        callback(data);
      });

      promise.fail(function(resp) {
        $(my.el).trigger('fail', [resp]);
      });
    };

    // Add commas to a number
    my.addCommas = function (n) {
      n = n || 0;
      while (/(\d+)(\d{3})/.test(n.toString())) {
        n = n.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
      }
      return n;
    };

    my.getData(function (data) {

      data = my.renderBoxplots(data);

      // Format the rest of the data
      _.each(data.alternatives, function (alt, k) {
        data.alternatives[k].participant_count   = my.addCommas(alt.participant_count);
        data.alternatives[k].visit_count         = my.addCommas(alt.visit_count);
        data.alternatives[k].interaction_count   = my.addCommas(alt.interaction_count);
        data.alternatives[k].completed_count     = Math.round(alt.completed_count * 1000) / 1000;
        data.alternatives[k].conversion_rate     = alt.conversion_rate.toFixed(2) + '%';
        data.alternatives[k].visit_rate          = alt.visit_rate.toFixed(2);
        data.alternatives[k].visit_interaction_rate = alt.visit_interaction_rate.toFixed(2);
        data.alternatives[k].visit_conversion_rate = alt.visit_conversion_rate.toFixed(2);
        data.alternatives[k].vr_confidence_interval = alt.vr_confidence_interval.toFixed(2);
        data.alternatives[k].vir_confidence_interval = alt.vir_confidence_interval.toFixed(2);
        data.alternatives[k].vcr_confidence_interval = alt.vcr_confidence_interval.toFixed(2);
        data.alternatives[k].confidence_interval = alt.confidence_interval.toFixed(1) + '%';
        data.alternatives[k].confidence_level    = alt.confidence_level.replace('N/A', '&mdash;');
      });

      my.el.append(my.template(data));

      $("li[data-name='" + my.codedName + "'] tr").on({
        mouseover: function () {
          var alt_name = $(this).attr('class');
          if (!alt_name) return;

          $(this).addClass('highlight');

          var line = d3.select("#" + alt_name);

          // if statement to prevent a bug where an error is thrown when
          // mouseout'ing from a zeroclipboard button
          if (line[0][0]) {
            var id = line.attr('id');
            var el = d3.select('#' + id)[0][0];

            if (line.attr('class') === 'circle') {
              line.attr('r', 7);
            } else {
              line.attr('class', line.attr('class') + " line-hover");
            }

            // Sort the lines so the current line is "above" the non-hovered lines
            $('#' + id + ', .circle-' + id).each(function() {
              this.parentNode.appendChild(this);
            });
          }
        },
        mouseout: function () {
          $(this).removeClass('highlight');

          var alt_name = $(this).attr('class');
          if (!alt_name) return;

          var line = d3.select('#' + alt_name);

          if (line.attr('class') === 'circle') {
            line.attr('r', 5);
          } else {
            line.attr('class', 'line');
          }
        }
      });

      var chart = new Chart(my.name, data);
      chart.draw();
      my.callback();

      // Responsive charts
      var size = $('.chart-container').width();
      $(window).on('resize', function() {
        var newSize = $('.chart-container').width();
        if (newSize !== size) {
          size = newSize;
          chart.remove();
          chart.draw();
        }
      });
    });

    my.renderBoxplots = function(data) {

      // normalize conversion rate boxplots
      var convRateHi = function (alt) {
        return alt.conversion_rate + alt.confidence_interval;
      };
      var convRateLo = function (alt) {
        return alt.conversion_rate - alt.confidence_interval;
      };
      normalizeBoxplots(data, 'boxplot', convRateLo, convRateHi);

      // normalize visit rate boxplots
      var visRateHi = function (alt) {
        return alt.visit_rate + alt.vr_confidence_interval;
      };
      var visRateLo = function (alt) {
        return alt.visit_rate - alt.vr_confidence_interval;
      };
      normalizeBoxplots(data, 'boxplotvr', visRateLo, visRateHi);

      // normalize visit interaction rate boxplots
      var visInterRateHi = function (alt) {
          return alt.visit_interaction_rate + alt.vir_confidence_interval;
      };
      var visInterRateLo = function (alt) {
          return alt.visit_interaction_rate - alt.vir_confidence_interval;
      };
      normalizeBoxplots(data, 'boxplotvir', visInterRateLo, visInterRateHi);

      // normalize visit conversion rate boxplots
      var visConvRateHi = function (alt) {
        return alt.visit_conversion_rate + alt.vcr_confidence_interval;
      };
      var visConvRateLo = function (alt) {
        return alt.visit_conversion_rate - alt.vcr_confidence_interval;
      };
      normalizeBoxplots(data, 'boxplotvcr', visConvRateLo, visConvRateHi);

      return data;
    };

    var normalizeBoxplots = function (data, bpName, loValFn, hiValFn) {
      var intervals = [],
          max =-Infinity,
          min = Infinity,
          control = null;

      _.each(data.alternatives, function (alt, k) {
        max = Math.max(max, hiValFn(alt));
        min = Math.min(min, loValFn(alt));
      });

      // Normalize the boxplot data

      _.each(data.alternatives, function (alt, k) {
        var start = (loValFn(alt) - min) / (max - min) * 100,
            end   = (hiValFn(alt) - min) / (max - min) * 100,
            neutral = {
              display: 'block',
              start: start,
              end: end
            },
            losing = { display: 'none', start: 0, end: 0 },
            winning = losing;

        // The winning/losing states are all relative to the control interval
        if (!control) {
          control = neutral;
        } else {
          // Show red when losing
          if (start < control.start) {
            losing = {
              display: 'block',
              start: start,
              end: Math.min(end, control.start)
            };
            neutral.start = control.start;
          }

          // Show green when winning
          if (end > control.end) {
            winning = {
              display: 'block',
              start: Math.max(start, control.end),
              end: end
            };
            neutral.end = control.end;
          }
        }

        data.alternatives[k][bpName] = {
          neutral: neutral,
          losing:  losing,
          winning: winning
        };
      });
    };

    return that;
  };
});
