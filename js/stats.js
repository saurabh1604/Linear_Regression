const Stats = {
    // Calculate Mean Squared Error
    calculateMSE: (xArr, yArr, m, c) => {
        if (xArr.length === 0) return 0;
        let sse = 0;
        for (let i = 0; i < xArr.length; i++) {
            const pred = m * xArr[i] + c;
            sse += Math.pow(yArr[i] - pred, 2);
        }
        return sse / xArr.length;
    },

    // Calculate OLS coefficients (Simple)
    calculateOLS: (xArr, yArr) => {
        const n = xArr.length;
        if (n < 2) return { m: 0, c: 0 };

        const sumX = xArr.reduce((a, b) => a + b, 0);
        const sumY = yArr.reduce((a, b) => a + b, 0);
        const sumXY = xArr.reduce((sum, x, i) => sum + x * yArr[i], 0);
        const sumXX = xArr.reduce((sum, x) => sum + x * x, 0);

        const denom = (n * sumXX - sumX * sumX);
        if (denom === 0) return { m: 0, c: 0 };

        const m = (n * sumXY - sumX * sumY) / denom;
        const c = (sumY - m * sumX) / n;

        return { m, c };
    },

    // Calculate R-Squared
    calculateR2: (xArr, yArr, m, c) => {
        const n = yArr.length;
        if (n < 2) return 0;

        const yMean = yArr.reduce((a, b) => a + b, 0) / n;
        let ssTot = 0;
        let ssRes = 0;

        for (let i = 0; i < n; i++) {
            const yPred = m * xArr[i] + c;
            ssRes += Math.pow(yArr[i] - yPred, 2);
            ssTot += Math.pow(yArr[i] - yMean, 2);
        }

        if (ssTot === 0) return 0;
        return 1 - (ssRes / ssTot);
    },

    // Calculate F-Statistic (Simple Regression)
    calculateFStat: (xArr, yArr, m, c) => {
        const n = xArr.length;
        if (n < 3) return 0;

        const r2 = Stats.calculateR2(xArr, yArr, m, c);
        if (r2 >= 1) return Infinity;
        return (r2 / 1) / ((1 - r2) / (n - 2));
    },

    // Gradient Descent Step
    calculateGradient: (xArr, yArr, m, c) => {
        const n = xArr.length;
        if (n === 0) return { dm: 0, dc: 0 };

        let dm = 0;
        let dc = 0;

        for (let i = 0; i < n; i++) {
            const pred = m * xArr[i] + c;
            const error = yArr[i] - pred;
            dm += (-2/n) * xArr[i] * error;
            dc += (-2/n) * error;
        }

        return { dm, dc };
    },

    // --- Advanced Module Utils ---

    // Generate Data with specific correlation between X1 and X2
    generateAdvancedData: (n, correlation, noiseX3 = false) => {
        const x1 = [];
        const x2 = [];
        const x3 = []; // Noise feature
        const y = [];

        for(let i=0; i<n; i++) {
            const u1 = Math.random();
            const u2 = Math.random();
            // Box-Muller for Normal Dist
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

            // X1 is random
            const valX1 = Math.random() * 10;
            x1.push(valX1);

            // X2 is correlated with X1
            // X2 = corr * X1 + sqrt(1-corr^2) * error
            // Actually simpler: X2 = alpha * X1 + (1-alpha) * Random
            // But mathematically correct for correlation rho:
            // Z_correlated = rho * Z1 + sqrt(1-rho^2) * Z2
            // Here let's just make it visually correlated.

            const noise = (Math.random() - 0.5) * 5;
            // If correlation is high, X2 is X1 + small noise
            // If correlation is low, X2 is random

            // Linear mix: X2 = correlation * X1 + (1-correlation) * Random
            // This isn't exactly correlation coefficient, but works for intuition.
            const valX2 = correlation * valX1 + (1 - correlation) * (Math.random() * 10) + noise * 0.2;
            x2.push(valX2);

            // X3 is pure noise
            x3.push(Math.random() * 10);

            // Y = 2*X1 + 3*X2 + 5 + error
            const trueError = (Math.random() - 0.5) * 4;
            y.push(2 * valX1 + 3 * valX2 + 5 + trueError);
        }
        return { x1, x2, x3, y };
    },

    calculateMultipleRegression: (X, y) => {
        // X is array of arrays (rows), y is array
        // Returns Beta = (X'X)^-1 X'y
        try {
            // Add intercept column to X
            const X_design = X.map(row => [1, ...row]);
            const y_vec = y;

            const Xt = math.transpose(X_design);
            const XtX = math.multiply(Xt, X_design);
            const XtX_inv = math.inv(XtX);
            const Xty = math.multiply(Xt, y_vec);

            const beta = math.multiply(XtX_inv, Xty); // [intercept, b1, b2...]

            // Statistics
            const n = y.length;
            const p = beta.length; // Number of parameters (k+1)

            // Predictions
            const y_pred = math.multiply(X_design, beta);

            // SSE
            let sse = 0;
            let sst = 0;
            const y_mean = y.reduce((a,b)=>a+b,0)/n;

            for(let i=0; i<n; i++) {
                sse += Math.pow(y[i] - y_pred[i], 2);
                sst += Math.pow(y[i] - y_mean, 2);
            }

            const r2 = 1 - (sse/sst);
            const adjR2 = 1 - ((1-r2)*(n-1)/(n-p));

            // Standard Errors
            const sigma2 = sse / (n - p);
            const covMatrix = math.multiply(sigma2, XtX_inv);
            const stdErrors = [];
            for(let i=0; i<p; i++) {
                // Diagonal elements
                const variance = covMatrix[i][i] || covMatrix._data[i][i]; // handle mathjs matrix types
                stdErrors.push(Math.sqrt(variance));
            }

            return {
                beta: beta, // Array or Matrix
                stdErrors: stdErrors,
                r2: r2,
                adjR2: adjR2
            };

        } catch (e) {
            console.error("Matrix Singular or Math Error", e);
            return null;
        }
    }
};
