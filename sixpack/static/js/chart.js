var Chart;
$(function () {

  Chart = function (experiment, data, callback) {
    var that = {}, my = {};

    my.colors = [
      '#E23630',
      '#308B3F',
      '#225AAC',
      '#e1e319',
      '#EA7F13',
      '#613095',
      '#992322',
      '#AB3D97',
      '#7E466F',
      '#A4433A',
      '#B8C6D7',
      '#5D300B',
      '#D09104',
      '#E99E62'
    ];
    my.el = null;
    my.data = data;
    my.experiment = experiment;

    my.getMeasurements = function () {
      my.margin = {
        top: 20,
        right: 20,
        bottom: 30,
        left: 50
      };
      
      my.width = my.el.width();
      my.height = my.el.height();
      my.xScale = d3.time.scale().range([0, my.width]);
      my.yScale = d3.scale.linear().range([my.height, 0]);
      my.y2Scale = d3.scale.linear().range([my.height, 0]);
    };

    my.drawLabels = function (data) {
      var xValues, yValues, yMin, yMax, y2Values, y2Min, y2Max;

      xValues = _.map(data, function (d) {
        return d[0];
      });

      yValues = _.map(data, function (d) {
        return parseFloat(d[1]);
      });
      yMin = _.min(yValues);
      yMax = _.max(yValues);
      yValues = [yMin, ((yMax - yMin) * 0.5) + yMin, yMax];

      y2Values = _.map(data, function (d) {
        return parseFloat(d[2]);
      });
      y2Min = _.min(y2Values);
      y2Max = _.max(y2Values);
      y2Values = [y2Min, ((y2Max - y2Min) * 0.5) + y2Min, y2Max];

      my.xAxis = d3.svg.axis()
        .scale(my.xScale)
        .tickSize(0)
        .tickFormat(d3.time.format("%-m/%-d"))
        .orient("bottom");
        
      if (xValues.length > 10) {
        my.xAxis.ticks(d3.time.days, 4);
      } else if (xValues.length === 2) {
        my.xAxis.ticks(d3.time.days, 1)
      } else {
        my.xAxis.ticks(xValues.length)
      }
        
      my.yAxis = d3.svg.axis()
        .scale(my.yScale)
        .ticks(yValues.length)
        .tickValues(yValues)
        .tickSize(0)
        .tickFormat(d3.format(".1%"))
        .orient("left");

      my.y2Axis = d3.svg.axis()
        .scale(my.y2Scale)
        .ticks(y2Values.length)
        .tickValues(y2Values)
        .tickSize(0)
        .tickFormat(d3.format(".1"))
        .orient("right");
    };

    my.drawLine = function (data, color) {
      color = color || "#9d5012";
      var line_id = my.experiment + "-line-" + _.indexOf(my.colors, color);
      var line = d3.svg.line()
        .x(function (d) {
          return my.xScale(d.date);
        })
        .y(function (d) {
          return my.yScale(d.close);
        });

      my.svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("id", line_id)
        .attr("d", line)
        .attr("style", "stroke:" + color);

      my.svg.select("#" + line_id)
        .data(data);

      var line2_id = my.experiment + "-line2-" + _.indexOf(my.colors, color);
      var line2 = d3.svg.line()
        .x(function (d) {
          return my.xScale(d.date);
        })
        .y(function (d) {
          return my.y2Scale(d.open);
        });

      my.svg.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("id", line2_id)
        .attr("d", line2)
        .attr("style", "stroke:" + color + "; stroke-dasharray: 5");

      my.svg.select("#" + line2_id)
        .data(data);

      var size = 5;

      if ($('#details-page').length) {
        if (my.width < 700) size = 3;
      }
      else if (data.length > 10) {
        size = 3;
      }

      my.svg.selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "circle circle-" + line_id)
        .attr("r", size)
        .attr("cx", function(d) { return my.xScale(d.date); })
        .attr("cy", function(d) { return my.yScale(d.close); })
        .attr("style", "fill:" + color)
        .on("mouseover", function (d) {
          var val = (Math.round(d.close * 1000) / 10) + '% conversion',
              date = new Date(d.date);
          circleMouseover(this, line_id, val, date);
        })
        .on("mouseout", function (d) {
          circleMouseout(this, line_id);
        });

      my.svg.selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "circle circle-" + line2_id)
        .attr("r", size)
        .attr("cx", function(d) { return my.xScale(d.date); })
        .attr("cy", function(d) { return my.y2Scale(d.open); })
        .attr("style", "fill:" + color)
        .on("mouseover", function (d) {
          var val = (Math.round(d.open * 100) / 100) + ' per visit',
              date = new Date(d.date);
          circleMouseover(this, line2_id, val, date);
        })
        .on("mouseout", function (d) {
          circleMouseout(this, line2_id);
        });

      var circleMouseover = function (self, lid, val, date) {
        // Make the circle larger
        d3.select(self)
          .attr("r", size + 3)
          .attr('class', 'circle circle-' + lid + ' circle-hover');

        // Make the line thicker
        var line = d3.select('#' + lid);
        var currClass = line.attr('class');
        line.attr('class', currClass + ' line-hover');

        // Highlight corresponding table alternative
        var table = $('.' + line_id).closest('div').find('table');
        table.find('tr').removeClass('highlight');
        table.find('.' + line_id).addClass('highlight');

        // Move the line all circles of the line to the front
        $('#' + lid + ', .circle-' + lid).each(function() {
          this.parentNode.appendChild(this);
        });

        // Show the tooltip
        var month = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'],
            dateString = month[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear(),
            pos = $(self).offset(),
            tooltipCircle = '<span class="tooltip-circle" style="background: ' + $(self).css('fill') + ';"></span> ';

        $('#tooltip')
           .html(tooltipCircle + dateString + ' &nbsp; ' + val)
           .show()
           .css({
             left: pos.left + 8 - (parseInt($('#tooltip').outerWidth()) / 2),
             top:  pos.top - 30
           });
      };

      var circleMouseout = function (self, lid) {
        // Return circle to normal
        d3.select(self)
          .attr("r", size)
          .attr('class', 'circle circle-' + lid);

        // Unhighlight the line
        var line = d3.select('#' + lid);
        line.attr('class', 'line');

        // Remove table highlight
        $('.' + line_id).removeClass('highlight');

        // Hide the tooltip
        $('#tooltip').hide();
      };
    };



    my.drawCircle = function (data, color) {
      color = color || "#9d5012";
      var id = my.experiment + "-line-" + _.indexOf(my.colors, color);
      my.svg.selectAll("dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "circle")
        .attr("id", id)
        .attr("r", 5)
        .attr("cx", function(d) { return my.xScale(d.date); })
        .attr("cy", function(d) { return my.yScale(d.close); })
        .attr("style", "fill:" + color)
        .on("mouseover", function (d) {
          // Sort the lines so the current line is "above" the non-hovered lines
          d3.select(this.parentNode.appendChild(this));
        });
    };

    my.drawArea = function (data) {
      var area = d3.svg.area()
        .x(function (d) {
          return my.xScale(d.date);
        })
        .y0(my.height)
        .y1(function (d) {
          return my.yScale(d.close);
        })
        .y2(function (d) {
          return my.y2Scale(d.open);
        });

      my.svg.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);
    };

    // Compose a D3-friendly data structure
    my.formatChartData = function (rates) {
      return rates.map(function (d) {
        return {
          date: d3.time.format("%Y-%m-%d").parse(d[0]),
          close: d[1],
          open: d[2]
        };
      });
    };

    my.drawBase = function () {
      my.svg = d3.select("[data-experiment='" + my.experiment + "']").append("svg")
        .attr("width", my.width + my.margin.left + my.margin.right)
        .attr("height", my.height + my.margin.top + my.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + my.margin.left + "," + my.margin.top + ")");
    };

    my.drawBackground = function (data) {
      my.xScale.domain(d3.extent(data, function (d) {
        return d.date;
      }));

      my.yScale.domain(d3.extent(data, function (d) {
        return d.close;
      }));

      my.y2Scale.domain(d3.extent(data, function (d) {
        return d.open;
      }));

      my.svg.append("g")
        .attr("class", "y-axis")
        .call(my.yAxis);

      my.svg.append("g")
        .attr("class", "y-axis")
        .attr("transform", "translate(" + my.width + " ,0)")
        .call(my.y2Axis);

      my.svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", "translate(0," + (my.height) + ")")
        .call(my.xAxis)
        .selectAll("text")
        .attr("dy", function(d) {
          return "1.15em";
        });

      my.svg.append("g")
        .attr("class", "grid")
        .attr("transform", "translate(0," + (my.height) + ")")
        .call(my.xAxis
              .ticks(d3.time.days)
              .tickSize(-my.height, 0, 0)
              .tickFormat(""));
    };

    my.dataExists = function (data) {
      if (data.rate_data.length === 0) {
        my.el.append("<p>Not enough data to chart</p>").fadeIn('fast');
        return false;
      }
      return true;
    };

    my.formatData = function (callback) {
      var alternatives = {};
      var cumulative = {
        participants: 0,
        visits: 0,
        interactions: 0,
        conversions: 0
      };
      var rate_data = [];
      var rate = 0;
      var vcrate = 0;

      _.each(data.alternatives, function (alt, k) {
        cumulative.participants = 0;
        cumulative.visits = 0;
        cumulative.interactions = 0;
        cumulative.conversions = 0;
        rate_data = [];

        _.each(alt.data, function (period) {
          cumulative.participants += period.participants;
          cumulative.visits += period.visits;
          cumulative.interactions += period.interactions;
          cumulative.conversions += period.conversions;

          rate = Number(cumulative.conversions / cumulative.interactions).toFixed(5);
          if (isNaN(rate)) rate = 0.00;
          vcrate = Number(cumulative.conversions / cumulative.visits).toFixed(5);
          if (isNaN(vcrate)) vcrate = 0.00;
          rate_data.push([period.date, rate, vcrate]);
        });

        alternatives[alt.name] = {
          'rate_data': rate_data,
          'd3_data': my.formatChartData(rate_data)
        };
      });

      my.data = alternatives;
    };

    that.draw = function () {
      my.el = $("[data-experiment='" + my.experiment.match(/\w+/g).join('-') + "']");
      
      // Get the aggregate data intervals for drawing labels + background
      var aggregate_rates = [];
      _.each(my.data, function (alt, k) {
        _.each(alt.rate_data, function (rate, k) {
          aggregate_rates.push(rate);
        });
      });

      if (aggregate_rates.length === 0) {
        return;
      }
      
      var data_intervals = _.uniq(_.map(aggregate_rates, function (d, k) {
        return d[0];
      }));

      var min_rate = _.min(_.map(aggregate_rates, function (n) {
        return parseFloat(n[1]);
      }));
      var min_rate2 = _.min(_.map(aggregate_rates, function (n) {
        return parseFloat(n[2]);
      }));

      var max_rate = _.max(_.map(aggregate_rates, function (n) {
        return parseFloat(n[1]);
      }));
      var max_rate2 = _.max(_.map(aggregate_rates, function (n) {
        return parseFloat(n[2]);
      }));

      var rate_data = _.map(data_intervals, function (date, index) {
        return [date, min_rate, min_rate2];
      });
      rate_data[0][1] = max_rate;
      rate_data[0][2] = max_rate2;


      var total_periods = rate_data.length;
      if (total_periods === 1) {
        var format = d3.time.format("%Y-%m-%d");
        var d = new Date(rate_data[0][0]);
        var rate_data = [
          [rate_data[0][0], rate_data[0][1], rate_data[0][2]],
          [format(new Date(d3.time.day.offset(d, 1))), min_rate, min_rate2 ],
          [format(new Date(d3.time.day.offset(d, 2))), max_rate, max_rate2 ]
        ];
      }

      var data = {
        rate_data: rate_data,
        d3_data: my.formatChartData(rate_data)
      };

      if (!my.dataExists(data)) return;

      my.getMeasurements();
      my.drawBase();
      my.drawLabels(data.rate_data);
      my.drawBackground(data.d3_data);

      var i = 0;
      _.each(my.data, function (data) {
        my.drawLine(data.d3_data, my.colors[i]);
        i++;
      });

      my.el.fadeIn('fast');
    };

    that.remove = function () {
      $(my.el).find('svg').remove();
    };

    my.formatData();

    return that;
  };

});