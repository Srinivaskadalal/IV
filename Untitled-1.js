<body>
  <h1>Cars by Country</h1>
  <input type="file" id="upload" accept=".xlsx, .xls" />
  <svg width="800" height="500"></svg>

  <script>
    const svg = d3.select("svg");
    const margin = { top: 40, right: 20, bottom: 60, left: 60 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    document.getElementById('upload').addEventListener('change', handleFile, false);

    function handleFile(event) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Expected structure: [{ country: 'USA', cars: 100 }, ...]
        drawChart(jsonData);
      };

      reader.readAsArrayBuffer(file);
    }

    function drawChart(data) {
      // Clear old content
      chart.selectAll("*").remove();

      const x = d3.scaleBand()
        .domain(data.map(d => d.country))
        .range([0, width])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.cars)])
        .nice()
        .range([height, 0]);

      chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

      chart.append("g")
        .call(d3.axisLeft(y));

      chart.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.country))
        .attr("y", d => y(+d.cars))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(+d.cars));

      // Axis Labels
      svg.selectAll(\".axis-label\").remove();

      svg.append(\"text\")
        .attr(\"class\", \"axis-label\")
        .attr(\"x\", width / 2 + margin.left)
        .attr(\"y\", svg.attr(\"height\") - 10)
        .attr(\"text-anchor\", \"middle\")
        .text(\"Country\");

      svg.append(\"text\")
        .attr(\"class\", \"axis-label\")
        .attr(\"transform\", \"rotate(-90)\")
        .attr(\"x\", -height / 2 - margin.top)
        .attr(\"y\", 20)
        .attr(\"text-anchor\", \"middle\")
        .text(\"Number of Cars (in millions)\");
    }
  </script>
</body>
