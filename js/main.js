// State Management
const state = {
    data: {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        y: [2, 4.5, 5, 8, 9.5, 11, 14, 15, 17, 21]
    },
    params: {
        m: 1,
        c: 0,
        lr: 0.01
    },
    isClickingPoint: false,
    isTraining: false,
    gdHistory: {
        iter: [],
        cost: []
    },
    adv: {
        n: 50,
        correlation: 0,
        hasNoise: false,
        data: null // {x1, x2, x3, y}
    }
};

// DOM Elements
const els = {
    slopeSlider: document.getElementById('slope-slider'),
    interceptSlider: document.getElementById('intercept-slider'),
    mVal: document.getElementById('m-val'),
    cVal: document.getElementById('c-val'),
    mseDisplay: document.getElementById('mse-display'),
    resetBtn: document.getElementById('reset-data-btn'),
    clearBtn: document.getElementById('clear-data-btn'),
    mainPlot: document.getElementById('main-plot'),

    // OLS Section
    olsBtn: document.getElementById('ols-btn'),
    r2Val: document.getElementById('r2-val'),
    bestMVal: document.getElementById('best-m-val'),
    bestCVal: document.getElementById('best-c-val'),
    fStatVal: document.getElementById('f-stat-val'),
    residualsPlot: document.getElementById('residuals-plot'),
    residualsHist: document.getElementById('residuals-hist'),

    // ML Section
    lrSlider: document.getElementById('lr-slider'),
    lrVal: document.getElementById('lr-val'),
    trainBtn: document.getElementById('train-btn'),
    resetGDBtn: document.getElementById('reset-gd-btn'),
    costSurfacePlot: document.getElementById('cost-surface-plot'),
    costHistoryPlot: document.getElementById('cost-history-plot'),

    // Advanced Section
    corrSlider: document.getElementById('corr-slider'),
    corrVal: document.getElementById('corr-val'),
    addNoiseBtn: document.getElementById('add-noise-btn'),
    resetAdvBtn: document.getElementById('reset-adv-btn'),
    multiScatterPlot: document.getElementById('multi-scatter-plot'),
    advR2: document.getElementById('adv-r2'),
    advAdjR2: document.getElementById('adv-adj-r2'),
    seX1: document.getElementById('se-x1'),
    seX2: document.getElementById('se-x2')
};

function init() {
    setupEventListeners();
    renderMainPlot();
    updateMetrics();
    updateStatsSection();
    renderCostSurface();
    renderCostHistory();

    // Advanced
    initAdvancedSection();
}

function setupEventListeners() {
    // Sliders
    els.slopeSlider.addEventListener('input', (e) => {
        if(state.isTraining) return;
        state.params.m = parseFloat(e.target.value);
        els.mVal.textContent = state.params.m;
        updateAllVisuals();
    });

    els.interceptSlider.addEventListener('input', (e) => {
        if(state.isTraining) return;
        state.params.c = parseFloat(e.target.value);
        els.cVal.textContent = state.params.c;
        updateAllVisuals();
    });

    // Buttons
    els.resetBtn.addEventListener('click', () => {
        resetData();
    });

    els.clearBtn.addEventListener('click', () => {
        state.data.x = [];
        state.data.y = [];
        updateAllVisuals();
    });

    els.olsBtn.addEventListener('click', () => {
        const { m, c } = Stats.calculateOLS(state.data.x, state.data.y);
        updateParams(m, c);
        updateAllVisuals();
    });

    // ML Controls
    els.lrSlider.addEventListener('input', (e) => {
        state.params.lr = parseFloat(e.target.value);
        els.lrVal.textContent = state.params.lr;
    });

    els.trainBtn.addEventListener('click', () => {
        if(state.isTraining) {
            state.isTraining = false;
            els.trainBtn.textContent = "Start Gradient Descent";
        } else {
            state.isTraining = true;
            els.trainBtn.textContent = "Stop Training";
            state.gdHistory.iter = [];
            state.gdHistory.cost = [];
            runGradientDescent();
        }
    });

    els.resetGDBtn.addEventListener('click', () => {
        state.isTraining = false;
        els.trainBtn.textContent = "Start Gradient Descent";
        state.params.m = 0;
        state.params.c = 0;
        state.gdHistory.iter = [];
        state.gdHistory.cost = [];
        updateParams(0, 0);
        updateAllVisuals();
    });

    // Advanced Controls
    els.corrSlider.addEventListener('input', (e) => {
        state.adv.correlation = parseFloat(e.target.value);
        els.corrVal.textContent = state.adv.correlation;
        updateAdvancedSection(true); // Regenerate data
    });

    els.addNoiseBtn.addEventListener('click', () => {
        state.adv.hasNoise = !state.adv.hasNoise;
        els.addNoiseBtn.textContent = state.adv.hasNoise ? "Remove Noise Feature" : "Add Random Noise Feature";
        updateAdvancedSection(false); // Don't regenerate base data, just toggle column
    });

    els.resetAdvBtn.addEventListener('click', () => {
        state.adv.correlation = 0;
        state.adv.hasNoise = false;
        els.corrSlider.value = 0;
        els.corrVal.textContent = 0;
        els.addNoiseBtn.textContent = "Add Random Noise Feature";
        initAdvancedSection();
    });
}

function resetData() {
    state.data.x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    state.data.y = [2, 4.5, 5, 8, 9.5, 11, 14, 15, 17, 21];
    state.params.m = 1;
    state.params.c = 0;
    updateParams(1, 0);
    updateAllVisuals();
}

function updateParams(m, c) {
    state.params.m = parseFloat(m.toFixed(4));
    state.params.c = parseFloat(c.toFixed(4));

    els.slopeSlider.value = Math.max(-5, Math.min(5, m));
    els.interceptSlider.value = Math.max(-10, Math.min(10, c));
    els.mVal.textContent = state.params.m.toFixed(2);
    els.cVal.textContent = state.params.c.toFixed(2);
}

function updateAllVisuals() {
    renderMainPlot();
    updatePlotLines();
    updateMetrics();
    updateStatsSection();
    updateCostSurfaceMarker();
}

// --- Main Plot (Scatter + Line) ---
function renderMainPlot() {
    const tracePoints = {
        x: state.data.x,
        y: state.data.y,
        mode: 'markers',
        type: 'scatter',
        name: 'Data Points',
        marker: { size: 12, color: '#3498db', line: {color: 'white', width: 2} },
        hoverinfo: 'x+y'
    };

    const xRange = [0, 12];
    const yLine = xRange.map(x => state.params.m * x + state.params.c);

    const traceLine = {
        x: xRange,
        y: yLine,
        mode: 'lines',
        type: 'scatter',
        name: 'Model',
        line: { color: '#e74c3c', width: 3 },
        hoverinfo: 'skip'
    };

    const { resX, resY } = getResidualsTraces();
    const traceResiduals = {
        x: resX,
        y: resY,
        mode: 'lines',
        name: 'Residuals',
        line: { color: '#95a5a6', width: 1, dash: 'dash' },
        hoverinfo: 'skip',
        showlegend: false
    };

    const layout = {
        title: 'Interactive Linear Regression',
        xaxis: { title: 'Feature (X)', range: [0, 12], zeroline: false, fixedrange: true },
        yaxis: { title: 'Target (Y)', range: [0, 25], zeroline: false, fixedrange: true },
        hovermode: 'closest',
        margin: { t: 40, r: 20, b: 40, l: 50 },
        dragmode: false
    };

    const config = { responsive: true, displayModeBar: false };

    Plotly.newPlot(els.mainPlot, [tracePoints, traceLine, traceResiduals], layout, config)
        .then(attachPlotListeners);
}

function getResidualsTraces() {
    const residualsX = [];
    const residualsY = [];
    for(let i=0; i<state.data.x.length; i++) {
        const x = state.data.x[i];
        const y_true = state.data.y[i];
        const y_pred = state.params.m * x + state.params.c;
        residualsX.push(x, x, null);
        residualsY.push(y_true, y_pred, null);
    }
    return { resX: residualsX, resY: residualsY };
}

function updatePlotLines() {
    const xRange = [0, 12];
    const yLine = xRange.map(x => state.params.m * x + state.params.c);
    const { resX, resY } = getResidualsTraces();

    Plotly.animate(els.mainPlot, {
        data: [
            {},
            { x: xRange, y: yLine },
            { x: resX, y: resY }
        ],
        traces: [0, 1, 2],
        layout: {}
    }, {
        transition: { duration: 0 },
        frame: { duration: 0, redraw: false }
    });
}

function attachPlotListeners() {
    const gd = els.mainPlot;
    gd.removeAllListeners('plotly_click');

    gd.on('plotly_click', (data) => {
        state.isClickingPoint = true;
        if (data.points && data.points[0].curveNumber === 0) {
            const indexToRemove = data.points[0].pointIndex;
            state.data.x.splice(indexToRemove, 1);
            state.data.y.splice(indexToRemove, 1);
            renderMainPlot();
            updateMetrics();
            updateStatsSection();
        }
    });

    if (!gd._customClickBound) {
        gd.addEventListener('click', (evt) => {
            setTimeout(() => {
                if (state.isClickingPoint) {
                    state.isClickingPoint = false;
                    return;
                }
                const xaxis = gd._fullLayout.xaxis;
                const yaxis = gd._fullLayout.yaxis;
                const bb = gd.getBoundingClientRect();
                const xPx = evt.clientX - bb.left;
                const yPx = evt.clientY - bb.top;

                if(xPx >= xaxis._offset && xPx <= (xaxis._offset + xaxis._length) &&
                   yPx >= yaxis._offset && yPx <= (yaxis._offset + yaxis._length)) {
                    const xVal = xaxis.p2d(xPx);
                    const yVal = yaxis.p2d(yPx);
                    state.data.x.push(xVal);
                    state.data.y.push(yVal);
                    renderMainPlot();
                    updateMetrics();
                    updateStatsSection();
                }
            }, 100);
        });
        gd._customClickBound = true;
    }
}

// --- Metrics & Stats ---
function updateMetrics() {
    const mse = Stats.calculateMSE(state.data.x, state.data.y, state.params.m, state.params.c);
    els.mseDisplay.textContent = mse.toFixed(2);
}

function updateStatsSection() {
    const r2 = Stats.calculateR2(state.data.x, state.data.y, state.params.m, state.params.c);
    const fStat = Stats.calculateFStat(state.data.x, state.data.y, state.params.m, state.params.c);

    els.r2Val.textContent = r2.toFixed(3);
    els.fStatVal.textContent = isFinite(fStat) ? fStat.toFixed(2) : 'Inf';
    els.bestMVal.textContent = state.params.m.toFixed(2);
    els.bestCVal.textContent = state.params.c.toFixed(2);

    const residuals = [];
    const fitted = [];
    for(let i=0; i<state.data.x.length; i++) {
        const pred = state.params.m * state.data.x[i] + state.params.c;
        fitted.push(pred);
        residuals.push(state.data.y[i] - pred);
    }

    const traceResFitted = {
        x: fitted, y: residuals, mode: 'markers', type: 'scatter', marker: { color: '#8e44ad' }
    };
    const layoutResFitted = {
        title: 'Residuals vs Fitted',
        xaxis: { title: 'Fitted' },
        yaxis: { title: 'Residuals' },
        margin: { t: 30, r: 20, b: 30, l: 40 },
        shapes: [{ type: 'line', x0: Math.min(...fitted, 0)-1, x1: Math.max(...fitted, 10)+1, y0: 0, y1: 0, line: { color: 'black', dash: 'dash', width: 1 } }]
    };
    Plotly.react(els.residualsPlot, [traceResFitted], layoutResFitted, { displayModeBar: false });

    const traceHist = { x: residuals, type: 'histogram', marker: { color: '#e67e22' } };
    const layoutHist = {
        title: 'Residuals Distribution',
        xaxis: { title: 'Residual' },
        yaxis: { title: 'Count' },
        margin: { t: 30, r: 20, b: 30, l: 40 }
    };
    Plotly.react(els.residualsHist, [traceHist], layoutHist, { displayModeBar: false });
}

// --- Machine Learning Section ---
function renderCostSurface() {
    const mVals = [];
    const cVals = [];
    const zVals = [];

    const mStart = -5, mEnd = 5, mStep = 0.5;
    const cStart = -10, cEnd = 10, cStep = 1;

    const mAxis = [];
    const cAxis = [];

    for (let m = mStart; m <= mEnd; m += mStep) mAxis.push(m);
    for (let c = cStart; c <= cEnd; c += cStep) cAxis.push(c);

    for (let j = 0; j < cAxis.length; j++) {
        const row = [];
        for (let i = 0; i < mAxis.length; i++) {
            const err = Stats.calculateMSE(state.data.x, state.data.y, mAxis[i], cAxis[j]);
            row.push(err);
        }
        zVals.push(row);
    }

    const traceSurface = {
        z: zVals,
        x: mAxis,
        y: cAxis,
        type: 'surface',
        colorscale: 'Viridis',
        opacity: 0.8,
        showscale: false
    };

    const mse = Stats.calculateMSE(state.data.x, state.data.y, state.params.m, state.params.c);
    const tracePoint = {
        x: [state.params.m],
        y: [state.params.c],
        z: [mse],
        mode: 'markers',
        type: 'scatter3d',
        marker: { size: 6, color: 'red' },
        name: 'Current Model'
    };

    const layout = {
        title: 'Cost Surface (MSE)',
        scene: {
            xaxis: { title: 'Slope (m)' },
            yaxis: { title: 'Intercept (c)' },
            zaxis: { title: 'Cost (J)' }
        },
        margin: { t: 40, r: 20, b: 20, l: 20 },
        height: 400
    };

    Plotly.newPlot(els.costSurfacePlot, [traceSurface, tracePoint], layout, { displayModeBar: false });
}

function updateCostSurfaceMarker() {
    const mse = Stats.calculateMSE(state.data.x, state.data.y, state.params.m, state.params.c);

    Plotly.restyle(els.costSurfacePlot, {
        x: [[state.params.m]],
        y: [[state.params.c]],
        z: [[mse]]
    }, [1]);
}

function renderCostHistory() {
    const traceCost = {
        x: state.gdHistory.iter,
        y: state.gdHistory.cost,
        mode: 'lines',
        name: 'Cost',
        line: { color: '#e74c3c' }
    };

    const layout = {
        title: 'Training Progress',
        xaxis: { title: 'Iteration' },
        yaxis: { title: 'Cost (MSE)' },
        margin: { t: 40, r: 20, b: 30, l: 40 },
        height: 300
    };

    Plotly.newPlot(els.costHistoryPlot, [traceCost], layout, { displayModeBar: false });
}

function updateCostHistoryTrace() {
    Plotly.extendTraces(els.costHistoryPlot, {
        x: [[state.gdHistory.iter[state.gdHistory.iter.length-1]]],
        y: [[state.gdHistory.cost[state.gdHistory.cost.length-1]]]
    }, [0]);
}

async function runGradientDescent() {
    let iter = 0;
    const maxIter = 500;

    while (state.isTraining && iter < maxIter) {
        const { dm, dc } = Stats.calculateGradient(state.data.x, state.data.y, state.params.m, state.params.c);

        state.params.m = state.params.m - state.params.lr * dm;
        state.params.c = state.params.c - state.params.lr * dc;

        const currentCost = Stats.calculateMSE(state.data.x, state.data.y, state.params.m, state.params.c);

        updateParams(state.params.m, state.params.c);
        updateAllVisuals();

        state.gdHistory.iter.push(iter);
        state.gdHistory.cost.push(currentCost);
        updateCostHistoryTrace();

        iter++;
        await new Promise(r => setTimeout(r, 50));
    }

    if (iter >= maxIter) {
        state.isTraining = false;
        els.trainBtn.textContent = "Start Gradient Descent";
    }
}

// --- Advanced Section ---
function initAdvancedSection() {
    // Generate fresh data
    updateAdvancedSection(true);
}

function updateAdvancedSection(regenerate = false) {
    if (regenerate) {
        state.adv.data = Stats.generateAdvancedData(state.adv.n, state.adv.correlation);
    }

    // Prepare Design Matrix X
    const X = [];
    const { x1, x2, x3, y } = state.adv.data;

    for(let i=0; i<x1.length; i++) {
        const row = [x1[i], x2[i]];
        if(state.adv.hasNoise) {
            row.push(x3[i]);
        }
        X.push(row);
    }

    // Calculate Regression
    const result = Stats.calculateMultipleRegression(X, y);

    if (result) {
        els.advR2.textContent = result.r2.toFixed(3);
        els.advAdjR2.textContent = result.adjR2.toFixed(3);

        // Coeff SEs (beta[0] is intercept, beta[1] is x1, beta[2] is x2)
        // Standard Errors: [SE_intercept, SE_x1, SE_x2, (SE_x3)]
        if(result.stdErrors.length > 1) {
            els.seX1.textContent = result.stdErrors[1].toFixed(3);
            els.seX2.textContent = result.stdErrors[2].toFixed(3);
        }
    }

    renderMultiScatter();
}

function renderMultiScatter() {
    const { x1, x2, y } = state.adv.data;

    const trace = {
        x: x1,
        y: x2,
        z: y,
        mode: 'markers',
        type: 'scatter3d',
        marker: {
            size: 5,
            color: y,
            colorscale: 'Viridis',
            opacity: 0.8
        },
        name: 'Data'
    };

    const layout = {
        title: '3D View (X1, X2, Y)',
        scene: {
            xaxis: { title: 'X1' },
            yaxis: { title: 'X2 (Correlated)' },
            zaxis: { title: 'Y' }
        },
        margin: { t: 30, r: 0, b: 0, l: 0 },
        height: 400
    };

    Plotly.react(els.multiScatterPlot, [trace], layout, { displayModeBar: false });
}

document.addEventListener('DOMContentLoaded', init);
