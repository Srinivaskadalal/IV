const color = d3.scaleOrdinal(d3.schemeCategory10);
let chartData = [];

window.addEventListener('load', () => {
  fetch("cars.xlsx")
    .then(res => res.arrayBuffer())
    .then(data => {
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      chartData = XLSX.utils.sheet_to_json(sheet);
      renderAllCharts();
    });
});

function renderAllCharts() {
  updateChart(1);
  updateChart(2);
  updateChart(3);
  updateChart(4);
}

function updateChart(chartNumber) {
  const selector = `#chart${chartNumber}-type`;
  const chartType = document.querySelector(selector).value;
  
  switch(chartNumber) {
    case 1:
      if (chartType === 'histogram') drawHistogram(chartData, 'MPG', '#chart1 svg');
      else if (chartType === 'boxplot') drawBoxPlot(chartData, 'MPG', '#chart1 svg');
      else if (chartType === 'violin') drawViolinPlot(chartData, 'MPG', '#chart1 svg');
      break;
    case 2:
      if (chartType === 'bar') drawBarAvgHorsepowerByCylinders(chartData, '#chart2 svg');
      else if (chartType === 'line') drawLineAvgHorsepowerByCylinders(chartData, '#chart2 svg');
      else if (chartType === 'pie') drawPieAvgHorsepowerByCylinders(chartData, '#chart2 svg');
      break;
    case 3:
      if (chartType === 'scatter') drawScatter(chartData, 'Displacement', 'Horsepower', '#chart3 svg');
      else if (chartType === 'hexbin') drawHexbin(chartData, 'Displacement', 'Horsepower', '#chart3 svg');
      else if (chartType === 'contour') drawContour(chartData, 'Displacement', 'Horsepower', '#chart3 svg');
      break;
    case 4:
      if (chartType === 'grouped-bar') drawBarAvgAccelerationByYear(chartData, '#chart4 svg');
      else if (chartType === 'stacked-bar') drawStackedBarAvgAccelerationByYear(chartData, '#chart4 svg');
      else if (chartType === 'area') drawAreaAvgAccelerationByYear(chartData, '#chart4 svg');
      break;
  }
}

function drawHistogram(data, field, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };

  const valuesByOrigin = d3.group(data, d => d.Origin);
  const x = d3.scaleLinear()
              .domain(d3.extent(data, d => +d[field])).nice()
              .range([margin.left, width - margin.right]);

  const binsByOrigin = new Map();
  for (const [origin, values] of valuesByOrigin.entries()) {
    const numericVals = values.map(d => +d[field]).filter(v => !isNaN(v));
    const bins = d3.bin().domain(x.domain()).thresholds(10)(numericVals);
    binsByOrigin.set(origin, bins);
  }

  const maxBin = d3.max([...binsByOrigin.values()].flat(), d => d.length);
  const y = d3.scaleLinear()
              .domain([0, maxBin])
              .range([height - margin.bottom, margin.top]);

  for (const [origin, bins] of binsByOrigin.entries()) {
    svg.selectAll(`.bar-${origin}`)
      .data(bins)
      .join("rect")
      .attr("x", d => x(d.x0) + 1)
      .attr("y", d => y(d.length))
      .attr("width", d => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr("height", d => y(0) - y(d.length))
      .attr("fill", color(origin))
      .attr("opacity", 0.7);
  }

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, [...valuesByOrigin.keys()], width);
}

function drawBoxPlot(data, field, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };

  const origins = [...new Set(data.map(d => d.Origin))];
  const x = d3.scaleBand()
              .domain(origins)
              .range([margin.left, width - margin.right])
              .padding(0.2);

  const numericData = data.map(d => ({...d, value: +d[field]})).filter(d => !isNaN(d.value));
  const y = d3.scaleLinear()
              .domain(d3.extent(numericData, d => d.value)).nice()
              .range([height - margin.bottom, margin.top]);

  origins.forEach((origin, i) => {
    const originData = numericData.filter(d => d.Origin === origin);
    const sorted = originData.map(d => d.value).sort(d3.ascending);
    
    const q1 = d3.quantile(sorted, 0.25);
    const median = d3.quantile(sorted, 0.5);
    const q3 = d3.quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const min = Math.max(sorted[0], q1 - 1.5 * iqr);
    const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);

    // Box
    svg.append("rect")
      .attr("x", x(origin))
      .attr("y", y(q3))
      .attr("width", x.bandwidth())
      .attr("height", y(q1) - y(q3))
      .attr("fill", color(origin))
      .attr("stroke", "#000");

    // Median line
    svg.append("line")
      .attr("x1", x(origin))
      .attr("x2", x(origin) + x.bandwidth())
      .attr("y1", y(median))
      .attr("y2", y(median))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Whiskers
    svg.append("line")
      .attr("x1", x(origin) + x.bandwidth() / 2)
      .attr("x2", x(origin) + x.bandwidth() / 2)
      .attr("y1", y(min))
      .attr("y2", y(max))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    // Bottom whisker cap
    svg.append("line")
      .attr("x1", x(origin) + x.bandwidth() / 4)
      .attr("x2", x(origin) + x.bandwidth() * 3/4)
      .attr("y1", y(min))
      .attr("y2", y(min))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    // Top whisker cap
    svg.append("line")
      .attr("x1", x(origin) + x.bandwidth() / 4)
      .attr("x2", x(origin) + x.bandwidth() * 3/4)
      .attr("y1", y(max))
      .attr("y2", y(max))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);
  });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text(`Box Plot of ${field} by Origin`);
}

function drawViolinPlot(data, field, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 40 };

  const origins = [...new Set(data.map(d => d.Origin))];
  const x = d3.scaleBand()
              .domain(origins)
              .range([margin.left, width - margin.right])
              .padding(0.2);

  const numericData = data.map(d => ({...d, value: +d[field]})).filter(d => !isNaN(d.value));
  const y = d3.scaleLinear()
              .domain(d3.extent(numericData, d => d.value)).nice()
              .range([height - margin.bottom, margin.top]);

  // Kernel density estimation function
  function kernelDensityEstimator(kernel, X) {
    return function(V) {
      return X.map(function(x) {
        return [x, d3.mean(V, function(v) { return kernel(x - v); })];
      });
    };
  }

  function kernelEpanechnikov(k) {
    return function(v) {
      return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
  }

  origins.forEach(origin => {
    const originData = numericData.filter(d => d.Origin === origin).map(d => d.value);
    const bandwidth = 0.2 * (d3.max(originData) - d3.min(originData));
    
    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), 
      d3.range(d3.min(originData), d3.max(originData), (d3.max(originData) - d3.min(originData)) / 100));
    
    const density = kde(originData);
    const maxDensity = d3.max(density, d => d[1]);
    
    const xScale = d3.scaleLinear()
                     .domain([0, maxDensity])
                     .range([0, x.bandwidth() / 2]);

    // Create path for violin shape
    const area = d3.area()
                   .x0(d => x(origin) + x.bandwidth() / 2 - xScale(d[1]))
                   .x1(d => x(origin) + x.bandwidth() / 2 + xScale(d[1]))
                   .y(d => y(d[0]))
                   .curve(d3.curveBasis);

    svg.append("path")
       .datum(density)
       .attr("d", area)
       .attr("fill", color(origin))
       .attr("opacity", 0.7)
       .attr("stroke", "#000")
       .attr("stroke-width", 1);
  });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text(`Violin Plot of ${field} by Origin`);
}

function drawBarAvgHorsepowerByCylinders(data, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const grouped = d3.rollups(
    data,
    v => d3.mean(v, d => +d.Horsepower),
    d => `${d.Cylinders} (${d.Origin})`
  );

  const x = d3.scaleLinear()
              .domain([0, d3.max(grouped, d => d[1])])
              .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
              .domain(grouped.map(d => d[0]))
              .range([margin.top, height - margin.bottom])
              .padding(0.2);

  svg.selectAll("rect")
    .data(grouped)
    .join("rect")
    .attr("x", margin.left)
    .attr("y", d => y(d[0]))
    .attr("width", d => x(d[1]) - margin.left)
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d[0].split("(")[1].replace(")", "").trim()));

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, [...new Set(data.map(d => d.Origin))], width);
}

function drawLineAvgHorsepowerByCylinders(data, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const origins = [...new Set(data.map(d => d.Origin))];
  const cylinders = [...new Set(data.map(d => d.Cylinders).filter(c => !isNaN(c)))].sort(d3.ascending);

  const line = d3.line()
                .x(d => x(d.cylinders))
                .y(d => y(d.avg));

  const x = d3.scaleBand()
              .domain(cylinders)
              .range([margin.left, width - margin.right])
              .padding(0.2);

  const maxHorsepower = d3.max(origins, origin => 
    d3.max(cylinders, cyl => {
      const vals = data.filter(d => d.Origin === origin && +d.Cylinders === cyl).map(d => +d.Horsepower);
      return vals.length ? d3.mean(vals) : 0;
    })
  );

  const y = d3.scaleLinear()
              .domain([0, maxHorsepower * 1.1])
              .range([height - margin.bottom, margin.top]);

  origins.forEach(origin => {
    const lineData = cylinders.map(cyl => {
      const vals = data.filter(d => d.Origin === origin && +d.Cylinders === cyl).map(d => +d.Horsepower);
      return {
        cylinders: cyl,
        avg: vals.length ? d3.mean(vals) : 0,
        origin: origin
      };
    });

    svg.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", color(origin))
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.selectAll(`.dot-${origin}`)
      .data(lineData)
      .enter().append("circle")
      .attr("cx", d => x(d.cylinders) + x.bandwidth() / 2)
      .attr("cy", d => y(d.avg))
      .attr("r", 4)
      .attr("fill", color(origin));
  });

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, origins, width);
}

function drawPieAvgHorsepowerByCylinders(data, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 20 };
  const radius = Math.min(width, height) / 2 - Math.max(margin.top, margin.right, margin.bottom, margin.left);

  const grouped = d3.rollups(
    data,
    v => d3.mean(v, d => +d.Horsepower),
    d => d.Cylinders
  ).filter(d => !isNaN(d[0]));

  const pie = d3.pie()
               .value(d => d[1])
               .sort(null);

  const arc = d3.arc()
               .innerRadius(0)
               .outerRadius(radius);

  const arcs = pie(grouped);

  const g = svg.append("g")
              .attr("transform", `translate(${width / 2}, ${height / 2})`);

  g.selectAll("path")
   .data(arcs)
   .enter().append("path")
   .attr("fill", (d, i) => color(i))
   .attr("d", arc)
   .attr("stroke", "white")
   .attr("stroke-width", 1);

  // Add labels
  g.selectAll("text")
   .data(arcs)
   .enter().append("text")
   .attr("transform", d => `translate(${arc.centroid(d)})`)
   .attr("text-anchor", "middle")
   .text(d => d.data[0])
   .attr("font-size", "12px");

  // Add legend
  const legend = svg.append("g")
                   .attr("transform", `translate(${width - margin.right - 100}, ${margin.top})`);

  grouped.forEach((d, i) => {
    const legendItem = legend.append("g")
                           .attr("transform", `translate(0, ${i * 20})`);
    
    legendItem.append("rect")
             .attr("width", 10)
             .attr("height", 10)
             .attr("fill", color(i));
    
    legendItem.append("text")
             .attr("x", 15)
             .attr("y", 10)
             .text(`${d[0]} cyl`)
             .attr("font-size", "12px");
  });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text("Average Horsepower by Cylinders");
}

function drawScatter(data, xField, yField, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const points = data.filter(d => d[xField] && d[yField]);

  const x = d3.scaleLinear()
              .domain(d3.extent(points, d => +d[xField])).nice()
              .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
              .domain(d3.extent(points, d => +d[yField])).nice()
              .range([height - margin.bottom, margin.top]);

  svg.selectAll("circle")
    .data(points)
    .join("circle")
    .attr("cx", d => x(+d[xField]))
    .attr("cy", d => y(+d[yField]))
    .attr("r", 4)
    .attr("fill", d => color(d.Origin))
    .attr("opacity", 0.7);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, [...new Set(points.map(d => d.Origin))], width);
}

function drawHexbin(data, xField, yField, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const points = data.filter(d => d[xField] && d[yField]).map(d => ({
    x: +d[xField],
    y: +d[yField],
    origin: d.Origin
  }));

  const x = d3.scaleLinear()
              .domain(d3.extent(points, d => d.x)).nice()
              .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
              .domain(d3.extent(points, d => d.y)).nice()
              .range([height - margin.bottom, margin.top]);

  // Hexbin parameters
  const hexbin = d3.hexbin()
                  .x(d => x(d.x))
                  .y(d => y(d.y))
                  .radius(15)
                  .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

  const bins = hexbin(points);
  const maxCount = d3.max(bins, d => d.length);

  const colorScale = d3.scaleSequential(d3.interpolateBlues)
                      .domain([0, maxCount]);

  svg.selectAll("path")
    .data(bins)
    .enter().append("path")
    .attr("d", hexbin.hexagon())
    .attr("transform", d => `translate(${d.x}, ${d.y})`)
    .attr("fill", d => colorScale(d.length))
    .attr("stroke", "white")
    .attr("stroke-width", 0.5);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Add color legend
  const legendWidth = 100;
  const legendHeight = 20;
  const legend = svg.append("g")
                   .attr("transform", `translate(${width - margin.right - legendWidth}, ${height - margin.bottom - 30})`);

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
                      .attr("id", "hexbin-gradient")
                      .attr("x1", "0%")
                      .attr("x2", "100%")
                      .attr("y1", "0%")
                      .attr("y2", "0%");

  gradient.selectAll("stop")
         .data(d3.range(0, 1.01, 0.2))
         .enter().append("stop")
         .attr("offset", d => `${d * 100}%`)
         .attr("stop-color", d => colorScale(d * maxCount));

  legend.append("rect")
       .attr("width", legendWidth)
       .attr("height", legendHeight)
       .attr("fill", "url(#hexbin-gradient)");

  legend.append("text")
       .attr("x", 0)
       .attr("y", -5)
       .text("Point Density")
       .attr("font-size", "10px");

  legend.append("text")
       .attr("x", 0)
       .attr("y", legendHeight + 15)
       .text("0")
       .attr("font-size", "10px");

  legend.append("text")
       .attr("x", legendWidth)
       .attr("y", legendHeight + 15)
       .text(maxCount)
       .attr("font-size", "10px")
       .attr("text-anchor", "end");
}

function drawContour(data, xField, yField, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const points = data.filter(d => d[xField] && d[yField]).map(d => [
    +d[xField],
    +d[yField]
  ]);

  const x = d3.scaleLinear()
              .domain(d3.extent(points, d => d[0])).nice()
              .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
              .domain(d3.extent(points, d => d[1])).nice()
              .range([height - margin.bottom, margin.top]);

  // Generate contours
  const contours = d3.contourDensity()
                    .x(d => x(d[0]))
                    .y(d => y(d[1]))
                    .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
                    .bandwidth(20)
                    (points);

  const colorScale = d3.scaleSequential(d3.interpolateViridis)
                      .domain(d3.extent(contours, d => d.value));

  svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .selectAll("path")
    .data(contours)
    .enter().append("path")
    .attr("d", d3.geoPath())
    .attr("fill", d => colorScale(d.value))
    .attr("stroke", "white")
    .attr("stroke-width", 0.5);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  // Add color legend
  const legendWidth = 100;
  const legendHeight = 20;
  const legend = svg.append("g")
                   .attr("transform", `translate(${width - margin.right - legendWidth}, ${height - margin.bottom - 30})`);

  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
                      .attr("id", "contour-gradient")
                      .attr("x1", "0%")
                      .attr("x2", "100%")
                      .attr("y1", "0%")
                      .attr("y2", "0%");

  gradient.selectAll("stop")
         .data(d3.range(0, 1.01, 0.2))
         .enter().append("stop")
         .attr("offset", d => `${d * 100}%`)
         .attr("stop-color", d => colorScale(d * d3.max(contours, c => c.value)));

  legend.append("rect")
       .attr("width", legendWidth)
       .attr("height", legendHeight)
       .attr("fill", "url(#contour-gradient)");

  legend.append("text")
       .attr("x", 0)
       .attr("y", -5)
       .text("Density")
       .attr("font-size", "10px");

  legend.append("text")
       .attr("x", 0)
       .attr("y", legendHeight + 15)
       .text("Low")
       .attr("font-size", "10px");

  legend.append("text")
       .attr("x", legendWidth)
       .attr("y", legendHeight + 15)
       .text("High")
       .attr("font-size", "10px")
       .attr("text-anchor", "end");
}

function drawBarAvgAccelerationByYear(data, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const grouped = d3.rollups(
    data,
    v => d3.mean(v, d => +d.Acceleration),
    d => d['Model Year'],
    d => d.Origin
  );

  const flatData = grouped.flatMap(([year, origins]) =>
    origins.map(([origin, avg]) => ({
      year,
      origin,
      avg
    }))
  );

  const x = d3.scaleBand()
              .domain([...new Set(flatData.map(d => d.year))])
              .range([margin.left, width - margin.right])
              .padding(0.2);

  const y = d3.scaleLinear()
              .domain([0, d3.max(flatData, d => d.avg)])
              .range([height - margin.bottom, margin.top]);

  const subgroups = [...new Set(flatData.map(d => d.origin))];
  const xSubgroup = d3.scaleBand()
                      .domain(subgroups)
                      .range([0, x.bandwidth()])
                      .padding(0.05);

  svg.selectAll("g.bar-group")
    .data(flatData)
    .join("rect")
    .attr("x", d => x(d.year) + xSubgroup(d.origin))
    .attr("y", d => y(d.avg))
    .attr("width", xSubgroup.bandwidth())
    .attr("height", d => y(0) - y(d.avg))
    .attr("fill", d => color(d.origin));

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, subgroups, width);
}

function drawStackedBarAvgAccelerationByYear(data, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const origins = [...new Set(data.map(d => d.Origin))];
  const years = [...new Set(data.map(d => d['Model Year']))].sort();

  const stack = d3.stack()
                 .keys(origins)
                 .value(([year], origin) => {
                   const vals = data.filter(d => d['Model Year'] === year && d.Origin === origin)
                                   .map(d => +d.Acceleration);
                   return vals.length ? d3.mean(vals) : 0;
                 });

  const series = stack(d3.rollup(
    data,
    v => v,
    d => d['Model Year']
  ));

  const x = d3.scaleBand()
              .domain(years)
              .range([margin.left, width - margin.right])
              .padding(0.2);

  const y = d3.scaleLinear()
              .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
              .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .selectAll("g")
    .data(series)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data[0]))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth());

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, origins, width);
}

function drawAreaAvgAccelerationByYear(data, selector) {
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const width = +svg.attr("width") || 400;
  const height = +svg.attr("height") || 300;
  const margin = { top: 40, right: 20, bottom: 40, left: 60 };

  const origins = [...new Set(data.map(d => d.Origin))];
  const years = [...new Set(data.map(d => d['Model Year']))].sort();

  const stack = d3.stack()
                 .keys(origins)
                 .value(([year], origin) => {
                   const vals = data.filter(d => d['Model Year'] === year && d.Origin === origin)
                                   .map(d => +d.Acceleration);
                   return vals.length ? d3.mean(vals) : 0;
                 })
                 .order(d3.stackOrderNone)
                 .offset(d3.stackOffsetNone);

  const series = stack(d3.rollup(
    data,
    v => v,
    d => d['Model Year']
  ));

  const x = d3.scaleBand()
              .domain(years)
              .range([margin.left, width - margin.right])
              .padding(0.2);

  const y = d3.scaleLinear()
              .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
              .range([height - margin.bottom, margin.top]);

  const area = d3.area()
                .x(d => x(d.data[0]) + x.bandwidth() / 2)
                .y0(d => y(d[0]))
                .y1(d => y(d[1]))
                .curve(d3.curveMonotoneX);

  svg.append("g")
    .selectAll("path")
    .data(series)
    .join("path")
    .attr("fill", d => color(d.key))
    .attr("d", area)
    .attr("opacity", 0.7);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  addLegend(svg, origins, width);
}

function addLegend(svg, items, width) {
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 120}, 10)`);

  items.forEach((item, i) => {
    const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    g.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(item));
    g.append("text").attr("x", 150).attr("y", 10).text(item).attr("font-size", "12px");
  });
}
