// Common Utils
const Utils = {
    generateData: (n, m, c, noise) => {
        const data = [];
        for (let i = 0; i < n; i++) {
            const x = Math.random() * 10;
            const y = m * x + c + (Math.random() - 0.5) * noise;
            data.push({ x, y, id: i });
        }
        return data.sort((a,b) => a.x - b.x);
    },

    // Setup SVG with margins
    setupSVG: (containerId, margin) => {
        const container = d3.select(containerId);
        const width = container.node().getBoundingClientRect().width;
        const height = container.node().getBoundingClientRect().height;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        return { svg, width: innerWidth, height: innerHeight };
    },

    // Common Scales
    getScales: (data, w, h) => {
        const xScale = d3.scaleLinear().domain([0, 10]).range([0, w]);
        const yScale = d3.scaleLinear().domain([0, 20]).range([h, 0]); // Assuming typical range
        return { xScale, yScale };
    }
};

window.D3Viz = {
    // --- Section 2: Baseline ---
    initBaseline: function(containerId) {
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const { svg, width, height } = Utils.setupSVG(containerId, margin);

        let data = Utils.generateData(10, 0.8, 2, 5);
        const { xScale, yScale } = Utils.getScales(data, width, height);

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));
        svg.append("g").call(d3.axisLeft(yScale));
        svg.append("text").attr("transform", `translate(${width/2}, ${height + 35})`).style("text-anchor", "middle").text("Size (sqft)");
        svg.append("text").attr("transform", "rotate(-90)").attr("y", 0 - margin.left).attr("x", 0 - (height / 2)).attr("dy", "1em").style("text-anchor", "middle").text("Price ($)");

        const residualsLayer = svg.append("g").attr("class", "residuals");
        const lineLayer = svg.append("g").attr("class", "line-layer");
        const pointsLayer = svg.append("g").attr("class", "points");

        const meanLine = lineLayer.append("line").attr("class", "mean-line").attr("x1", 0).attr("x2", width);

        function update() {
            const meanY = d3.mean(data, d => d.y);
            meanLine.transition().duration(50).attr("y1", yScale(meanY)).attr("y2", yScale(meanY));

            const residuals = residualsLayer.selectAll("line").data(data, d => d.id);
            residuals.enter().append("line").attr("class", "residual-line").merge(residuals)
                .attr("x1", d => xScale(d.x)).attr("x2", d => xScale(d.x))
                .attr("y1", d => yScale(d.y)).attr("y2", yScale(meanY));

            const points = pointsLayer.selectAll("circle").data(data, d => d.id);
            const drag = d3.drag().on("drag", function(event, d) {
                const newY = yScale.invert(event.y);
                d.y = Math.max(0, Math.min(20, newY));
                d3.select(this).attr("cy", yScale(d.y));
                update();
            });

            points.enter().append("circle").attr("class", "data-point").attr("r", 8).call(drag).merge(points).attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y));
        }
        update();
    },

    // --- Section 3 & 4: Interactive Fitting ---
    initFitting: function(containerId) {
        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const { svg, width, height } = Utils.setupSVG(containerId, margin);
        let data = Utils.generateData(10, 1.2, 1, 4);
        const { xScale, yScale } = Utils.getScales(data, width, height);
        let showSquares = false;
        let model = { m: 0, c: 10 };

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale));
        svg.append("g").call(d3.axisLeft(yScale));

        const squaresLayer = svg.append("g").attr("class", "squares");
        const residualsLayer = svg.append("g").attr("class", "residuals");
        const lineLayer = svg.append("g").attr("class", "line-layer");
        const pointsLayer = svg.append("g").attr("class", "points");
        const controlsLayer = svg.append("g").attr("class", "controls-layer");

        const regLine = lineLayer.append("line").attr("class", "regression-line").attr("x1", 0).attr("x2", width);
        const handle1 = controlsLayer.append("circle").attr("class", "handle").attr("r", 8).attr("cx", 0);
        const handle2 = controlsLayer.append("circle").attr("class", "handle").attr("r", 8).attr("cx", width);

        pointsLayer.selectAll("circle").data(data).enter().append("circle").attr("class", "data-point").attr("r", 6)
            .attr("cx", d => xScale(d.x)).attr("cy", d => yScale(d.y)).style("cursor", "default");

        const updateLineFromHandles = () => {
            const y1 = parseFloat(handle1.attr("cy"));
            const y2 = parseFloat(handle2.attr("cy"));
            const valY1 = yScale.invert(y1);
            const valY2 = yScale.invert(y2);
            const valX1 = xScale.invert(0);
            const valX2 = xScale.invert(width);
            model.m = (valY2 - valY1) / (valX2 - valX1);
            model.c = valY1 - model.m * valX1;
            updateViz();
        };

        const dragHandle = d3.drag().on("drag", function(event) {
            const newY = Math.max(0, Math.min(height, event.y));
            d3.select(this).attr("cy", newY);
            updateLineFromHandles();
        });

        handle1.call(dragHandle);
        handle2.call(dragHandle);

        function updateViz() {
            const y1 = yScale(model.m * xScale.invert(0) + model.c);
            const y2 = yScale(model.m * xScale.invert(width) + model.c);
            regLine.attr("y1", y1).attr("y2", y2);
            handle1.attr("cy", y1);
            handle2.attr("cy", y2);

            let sse = 0;
            const resData = data.map(d => {
                const pred = model.m * d.x + model.c;
                const error = d.y - pred;
                sse += error * error;
                return { ...d, pred, error };
            });
            const mse = sse / data.length;

            // Calculate R-squared
            const meanY = d3.mean(data, d => d.y);
            const sst = d3.sum(data, d => Math.pow(d.y - meanY, 2));
            const r2 = 1 - (sse / sst);

            d3.select("#mse-val").text(mse.toFixed(2));
            d3.select("#r2-val").text(r2.toFixed(2));

            const residuals = residualsLayer.selectAll("line").data(resData);
            residuals.enter().append("line").attr("class", "residual-line").merge(residuals)
                .attr("x1", d => xScale(d.x)).attr("x2", d => xScale(d.x))
                .attr("y1", d => yScale(d.y)).attr("y2", d => yScale(d.pred));

            const squares = squaresLayer.selectAll("rect").data(resData);
            if (showSquares) {
                squares.enter().append("rect").attr("class", "error-square").merge(squares)
                    .attr("opacity", 1)
                    .attr("x", d => xScale(d.x))
                    .attr("y", d => Math.min(yScale(d.y), yScale(d.pred)))
                    .attr("width", d => Math.abs(yScale(d.y) - yScale(d.pred)))
                    .attr("height", d => Math.abs(yScale(d.y) - yScale(d.pred)));
            } else {
                squares.merge(squares).attr("opacity", 0);
            }
        }

        document.getElementById("toggle-squares-btn").addEventListener("click", function() {
            showSquares = !showSquares;
            this.textContent = showSquares ? "Hide Squared Errors" : "Show Squared Errors";
            updateViz();
        });
        document.getElementById("reset-fit-btn").addEventListener("click", function() {
             model = { m: 0, c: 10 };
             updateViz();
        });
        updateViz();
    },

    // --- Section 5: Gradient Descent ---
    initGradientDescent: function(lineId, contourId) {
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const vizLine = Utils.setupSVG(lineId, margin);
        const data = Utils.generateData(20, 1.5, 2, 3);
        const scales = Utils.getScales(data, vizLine.width, vizLine.height);

        vizLine.svg.append("g").attr("transform", `translate(0,${vizLine.height})`).call(d3.axisBottom(scales.xScale));
        vizLine.svg.append("g").call(d3.axisLeft(scales.yScale));
        vizLine.svg.selectAll("circle").data(data).enter().append("circle")
            .attr("class", "data-point").attr("r", 4)
            .attr("cx", d => scales.xScale(d.x)).attr("cy", d => scales.yScale(d.y));
        const regLine = vizLine.svg.append("line").attr("class", "regression-line").style("stroke", "#e74c3c");

        const vizContour = Utils.setupSVG(contourId, margin);
        const mDomain = [-1, 4];
        const cDomain = [-5, 15];
        const xCScale = d3.scaleLinear().domain(mDomain).range([0, vizContour.width]);
        const yCScale = d3.scaleLinear().domain(cDomain).range([vizContour.height, 0]);

        vizContour.svg.append("g").attr("transform", `translate(0,${vizContour.height})`).call(d3.axisBottom(xCScale).ticks(5));
        vizContour.svg.append("g").call(d3.axisLeft(yCScale).ticks(5));
        vizContour.svg.append("text").attr("transform", `translate(${vizContour.width/2}, ${vizContour.height+25})`).style("text-anchor","middle").text("Slope (m)");
        vizContour.svg.append("text").attr("transform", "rotate(-90)").attr("y", -30).attr("x", -vizContour.height/2).style("text-anchor","middle").text("Intercept (c)");

        const n = data.length;
        const sumX = d3.sum(data, d => d.x);
        const sumY = d3.sum(data, d => d.y);
        const sumXY = d3.sum(data, d => d.x * d.y);
        const sumXX = d3.sum(data, d => d.x * d.x);
        const optM = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const optC = (sumY - optM * sumX) / n;

        const contours = [1, 5, 10, 20, 50, 100];
        contours.reverse().forEach(val => {
             vizContour.svg.append("ellipse")
                .attr("cx", xCScale(optM)).attr("cy", yCScale(optC))
                .attr("rx", val * 5).attr("ry", val * 10)
                .style("fill", "none").style("stroke", "#ddd").style("stroke-width", 1);
        });
        vizContour.svg.append("circle").attr("cx", xCScale(optM)).attr("cy", yCScale(optC)).attr("r", 3).style("fill", "#27ae60");
        const ball = vizContour.svg.append("circle").attr("r", 6).style("fill", "#e74c3c").style("stroke", "white").style("stroke-width", 2);

        let currentM = 0;
        let currentC = 0;
        let lr = 0.01;
        let isRunning = false;

        function updateAll() {
             const y1 = scales.yScale(currentM * scales.xScale.invert(0) + currentC);
             const y2 = scales.yScale(currentM * scales.xScale.invert(vizLine.width) + currentC);
             regLine.attr("x1", 0).attr("x2", vizLine.width).attr("y1", y1).attr("y2", y2);
             ball.attr("cx", xCScale(currentM)).attr("cy", yCScale(currentC));
        }

        function step() {
            let dm = 0;
            let dc = 0;
            for(let i=0; i<n; i++) {
                const pred = currentM * data[i].x + currentC;
                const err = data[i].y - pred;
                dm += (-2/n) * data[i].x * err;
                dc += (-2/n) * err;
            }
            currentM -= lr * dm;
            currentC -= lr * dc;
            updateAll();
        }

        document.getElementById("step-gd-btn").addEventListener("click", step);
        const runBtn = document.getElementById("run-gd-btn");
        runBtn.addEventListener("click", () => {
            if (isRunning) {
                isRunning = false;
                runBtn.textContent = "Run";
            } else {
                isRunning = true;
                runBtn.textContent = "Stop";
                const loop = () => {
                    if(!isRunning) return;
                    step();
                    requestAnimationFrame(loop);
                };
                loop();
            }
        });
        document.getElementById("reset-gd-btn").addEventListener("click", () => {
             isRunning = false;
             runBtn.textContent = "Run";
             currentM = 0;
             currentC = 0;
             updateAll();
        });
        document.getElementById("lr-slider").addEventListener("input", (e) => {
             lr = parseFloat(e.target.value);
             document.getElementById("lr-val").textContent = lr;
        });
        updateAll();
    },

    // --- Section 6: Diagnostics ---
    initDiagnostics: function(mainId, residId, qqId) {
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const vizMain = Utils.setupSVG(mainId, margin);
        const vizResid = Utils.setupSVG(residId, margin);
        const vizQQ = Utils.setupSVG(qqId, margin);

        const xScale = d3.scaleLinear().domain([0, 10]).range([0, vizMain.width]);
        const yScale = d3.scaleLinear().domain([0, 20]).range([vizMain.height, 0]);

        vizMain.svg.append("g").attr("transform", `translate(0,${vizMain.height})`).call(d3.axisBottom(xScale));
        vizMain.svg.append("g").call(d3.axisLeft(yScale));
        vizMain.svg.append("text").attr("x", vizMain.width/2).attr("y", -5).style("text-anchor","middle").style("font-size","0.8rem").text("Data & Fit");

        const rYScale = d3.scaleLinear().domain([-5, 5]).range([vizResid.height, 0]);
        vizResid.svg.append("g").attr("transform", `translate(0,${vizResid.height/2})`).call(d3.axisBottom(xScale).ticks(5));
        vizResid.svg.append("g").call(d3.axisLeft(rYScale).ticks(5));
        vizResid.svg.append("text").attr("x", vizResid.width/2).attr("y", -5).style("text-anchor","middle").style("font-size","0.8rem").text("Residuals vs Fitted");

        const qScale = d3.scaleLinear().domain([-3, 3]).range([0, vizQQ.width]);
        vizQQ.svg.append("g").attr("transform", `translate(0,${vizQQ.height})`).call(d3.axisBottom(qScale).ticks(5));
        vizQQ.svg.append("g").call(d3.axisLeft(rYScale).ticks(5));
        vizQQ.svg.append("text").attr("x", vizQQ.width/2).attr("y", -5).style("text-anchor","middle").style("font-size","0.8rem").text("Q-Q Plot");
        vizQQ.svg.append("line").attr("x1", qScale(-3)).attr("x2", qScale(3)).attr("y1", rYScale(-3)).attr("y2", rYScale(3)).style("stroke", "#bbb").style("stroke-dasharray", "4");

        const layers = {
            mainPts: vizMain.svg.append("g"),
            mainLine: vizMain.svg.append("line").attr("class", "regression-line").style("stroke", "#e74c3c"),
            residPts: vizResid.svg.append("g"),
            qqPts: vizQQ.svg.append("g")
        };

        function generateDiagData(type) {
            const n = 50;
            const data = [];
            for(let i=0; i<n; i++) {
                const x = Math.random() * 10;
                let y;
                const noise = (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 2;

                if (type === 'linear') {
                    y = 1.5 * x + 2 + noise;
                } else if (type === 'hetero') {
                    y = 1.5 * x + 2 + noise * (0.2 + x/3);
                } else if (type === 'nonlinear') {
                    y = 0.15 * x * x + 2 + noise;
                } else if (type === 'outlier') {
                    y = 1.5 * x + 2 + noise;
                    if (Math.random() < 0.1) y += (Math.random() > 0.5 ? 10 : -10);
                }
                data.push({x, y});
            }
            return data.sort((a,b) => a.x - b.x);
        }

        // Helper to calculate regression statistics
        function calculateStats(data) {
            const n = data.length;
            const sX = d3.sum(data, d => d.x);
            const sY = d3.sum(data, d => d.y);
            const sXY = d3.sum(data, d => d.x * d.y);
            const sXX = d3.sum(data, d => d.x * d.x);
            const sYY = d3.sum(data, d => d.y * d.y);

            const meanX = sX / n;
            const meanY = sY / n;

            // Slope and Intercept
            const Sxx = sXX - (sX * sX) / n;
            const Sxy = sXY - (sX * sY) / n;
            const m = Sxy / Sxx;
            const c = meanY - m * meanX;

            // Calculate Residuals and SSE
            let sse = 0;
            data.forEach(d => {
                const pred = m * d.x + c;
                sse += Math.pow(d.y - pred, 2);
            });

            // Variance of Error Term
            const mse = sse / (n - 2); // Unbiased estimator (n-2 df)

            // Standard Errors
            const seM = Math.sqrt(mse / Sxx);
            const seC = Math.sqrt(mse * (1/n + (meanX * meanX) / Sxx));

            // t-statistics
            const tM = m / seM;
            const tC = c / seC;

            // Simple p-value approximation (assuming Normal distribution for large N > 30)
            // Using a simple approximation for the Gaussian Error Function (erf)
            function getPValue(t) {
                // Two-tailed p-value
                const x = Math.abs(t);
                // Abramowitz and Stegun approximation
                const p = 0.3275911;
                const a1 = 0.254829592;
                const a2 = -0.284496736;
                const a3 = 1.421413741;
                const a4 = -1.453152027;
                const a5 = 1.061405429;

                const t_val = 1 / (1 + p * x);
                const erf = 1 - ((((a5 * t_val + a4) * t_val + a3) * t_val + a2) * t_val + a1) * t_val * Math.exp(-x * x);

                return (1 - erf); // Two-tailed logic handled by abs(t)? No, 1-erf gives tail probability.
                // Wait, standard normal CDF is (1 + erf(x/sqrt(2)))/2.
                // But this approximation is for erf directly? No, usually for normal CDF.
                // Let's use a simpler known approximation for Normal CDF.
                // Or just use Math.erfc if available (modern browsers have it, but maybe not in all environments).

                // Let's use a simpler 1-CDF approximation.
                // Z-score to p-value
                const z = x;
                // If z > 6, p is effectively 0
                if (z > 6) return 0;

                // Standard Normal CDF approximation
                const b1 =  0.319381530;
                const b2 = -0.356563782;
                const b3 =  1.781477937;
                const b4 = -1.821255978;
                const b5 =  1.330274429;
                const t_k = 1.0 / (1.0 + 0.2316419 * z);
                const Cdf = 1.0 - (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) *
                            (b1 * t_k + b2 * Math.pow(t_k, 2) + b3 * Math.pow(t_k, 3) + b4 * Math.pow(t_k, 4) + b5 * Math.pow(t_k, 5));
                return 2 * (1 - Cdf); // Two-tailed
            }

            const pM = getPValue(tM);
            const pC = getPValue(tC);

            // F-statistic
            // SST = Total Sum of Squares = S_yy - (S_y)^2/n
            // SSR = Regression Sum of Squares = SST - SSE
            // F = (SSR / p) / (SSE / (n - p - 1)) where p = 1 predictor
            const sst = sYY - (sY * sY) / n;
            const ssr = sst - sse;
            const fStat = (ssr / 1) / (sse / (n - 2));
            // F-prob is P(F > fStat) with df1=1, df2=n-2.
            // For F(1, v), it is t^2 with v degrees of freedom. So prob(F) is same as p-value of t-test for the single predictor.
            const pF = pM; // In simple linear regression, F-test p-value = t-test p-value for slope.

            return { m, c, seM, seC, tM, tC, pM, pC, fStat, pF };
        }

        function update(type) {
            const data = generateDiagData(type);
            const stats = calculateStats(data);
            const m = stats.m;
            const c = stats.c;

            // Update Table
            const tbody = document.getElementById("stats-table-body");
            tbody.innerHTML = `
                <tr>
                    <td>Intercept (Constant)</td>
                    <td>${c.toFixed(4)}</td>
                    <td>${stats.seC.toFixed(4)}</td>
                    <td>${stats.tC.toFixed(4)}</td>
                    <td>${stats.pC < 0.001 ? "< 0.001" : stats.pC.toFixed(4)}</td>
                </tr>
                <tr>
                    <td>Slope (x)</td>
                    <td>${m.toFixed(4)}</td>
                    <td>${stats.seM.toFixed(4)}</td>
                    <td>${stats.tM.toFixed(4)}</td>
                    <td>${stats.pM < 0.001 ? "< 0.001" : stats.pM.toFixed(4)}</td>
                </tr>
            `;

            document.getElementById("f-stat").textContent = stats.fStat.toFixed(4);
            document.getElementById("f-prob").textContent = stats.pF < 0.001 ? "< 0.001" : stats.pF.toFixed(4);

            const fitted = data.map(d => {
                const pred = m * d.x + c;
                return { ...d, pred, res: d.y - pred };
            });

            const y1 = yScale(m * xScale.invert(0) + c);
            const y2 = yScale(m * xScale.invert(vizMain.width) + c);
            layers.mainLine.transition().attr("x1", 0).attr("x2", vizMain.width).attr("y1", y1).attr("y2", y2);

            const pts = layers.mainPts.selectAll("circle").data(data);
            pts.enter().append("circle").attr("class", "data-point").attr("r", 3)
                .merge(pts).transition().attr("cx", d=>xScale(d.x)).attr("cy", d=>yScale(d.y));
            pts.exit().remove();

            const rPts = layers.residPts.selectAll("circle").data(fitted);
            rPts.enter().append("circle").attr("class", "data-point").attr("r", 3).style("fill", "#8e44ad")
                .merge(rPts).transition().attr("cx", d=>xScale(d.pred)).attr("cy", d=>rYScale(d.res));
            rPts.exit().remove();

            const sortedRes = fitted.map(d => d.res).sort((a,b) => a-b);
            const qqData = sortedRes.map((r, i) => {
                const p = (i + 0.5) / n;
                const z = 4.91 * (Math.pow(p, 0.14) - Math.pow(1 - p, 0.14));
                return { z, r };
            });

            const qPts = layers.qqPts.selectAll("circle").data(qqData);
            qPts.enter().append("circle").attr("class", "data-point").attr("r", 3).style("fill", "#27ae60")
                .merge(qPts).transition().attr("cx", d=>qScale(d.z)).attr("cy", d=>rYScale(d.r));
            qPts.exit().remove();
        }

        document.querySelectorAll(".data-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                document.querySelectorAll(".data-btn").forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
                update(e.target.dataset.type);
            });
        });

        update("linear");
    },

    // --- Section 7: Advanced (Plotly 3D) ---
    initAdvanced: function(containerId) {
        // Use Plotly for 3D
        function generateData(correlation) {
            const n = 100;
            const x1 = [];
            const x2 = [];
            const y = [];

            for(let i=0; i<n; i++) {
                const u1 = Math.random();
                const u2 = Math.random();
                // Random X1
                const v1 = Math.random() * 10;
                // Correlated X2
                const noise = (Math.random() - 0.5) * 2;
                const v2 = correlation * v1 + (1 - correlation) * (Math.random() * 10) + noise;

                // Y = 2*X1 + 3*X2 + 5 + error
                const err = (Math.random() - 0.5) * 5;
                const valY = 2 * v1 + 3 * v2 + 5 + err;

                x1.push(v1);
                x2.push(v2);
                y.push(valY);
            }
            return { x1, x2, y };
        }

        function calculateSE(data) {
            // Matrix algebra using Math.js
            try {
                const X = data.x1.map((v, i) => [1, v, data.x2[i]]); // Design matrix
                const Y = data.y;

                const Xt = math.transpose(X);
                const XtX = math.multiply(Xt, X);
                const XtX_inv = math.inv(XtX);
                const Xty = math.multiply(Xt, Y);
                const beta = math.multiply(XtX_inv, Xty);

                // Variance
                const n = Y.length;
                const p = 3;
                let sse = 0;
                for(let i=0; i<n; i++) {
                    const pred = beta[0] + beta[1]*data.x1[i] + beta[2]*data.x2[i];
                    sse += Math.pow(Y[i] - pred, 2);
                }
                const sigma2 = sse / (n - p);
                const cov = math.multiply(sigma2, XtX_inv);

                return {
                    seX1: Math.sqrt(cov[1][1] || cov._data[1][1]),
                    seX2: Math.sqrt(cov[2][2] || cov._data[2][2])
                };
            } catch(e) {
                return { seX1: NaN, seX2: NaN };
            }
        }

        function update(corr) {
            const data = generateData(corr);
            const stats = calculateSE(data);

            document.getElementById("se-x1").textContent = stats.seX1.toFixed(3);
            document.getElementById("se-x2").textContent = stats.seX2.toFixed(3);

            const trace = {
                x: data.x1,
                y: data.x2,
                z: data.y,
                mode: 'markers',
                type: 'scatter3d',
                marker: { size: 4, color: data.y, colorscale: 'Viridis' }
            };

            const layout = {
                margin: { l: 0, r: 0, b: 0, t: 0 },
                scene: {
                    xaxis: { title: 'X1' },
                    yaxis: { title: 'X2' },
                    zaxis: { title: 'Y' }
                }
            };

            Plotly.react(containerId.replace("#", ""), [trace], layout);
        }

        document.getElementById("corr-slider").addEventListener("input", (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById("corr-val").textContent = val;
            update(val);
        });

        update(0);
    }
};
