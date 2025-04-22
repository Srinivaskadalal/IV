const color = d3.scaleOrdinal(d3.schemeCategory10); // For Origin color-coding

window.addEventListener('load', () => {
  fetch("cars.xlsx")
    .then(res => res.arrayBuffer())
    .then(data => {
      const workbook = XLSX.read(new Uint8Array(data), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      renderCharts(json);
    });
});

function renderCharts(data) {
  drawHistogram(data, 'MPG', '#chart1 svg');
  drawBarAvgHorsepowerByCylinders(data, '#chart2 svg');
  drawScatter(data, 'Displacement', 'Horsepower', '#chart3 svg');
  drawBarAvgAccelerationByYear(data, '#chart4 svg');
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

// Reusable legend function
function addLegend(svg, origins, width) {
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 100}, 10)`);

  origins.forEach((origin, i) => {
    const g = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
    g.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(origin));
    g.append("text").attr("x", 15).attr("y", 10).text(origin).attr("font-size", "12px");
  });
}
