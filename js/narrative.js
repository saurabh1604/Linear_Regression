document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.tab-content');

    // State to track initialized charts to prevent double init
    const initializedTabs = new Set();

    // Map tab IDs to their D3 init functions
    const initActions = {
        'baseline': () => window.D3Viz.initBaseline("#viz-baseline"),
        'fitting': () => window.D3Viz.initFitting("#viz-fitting"),
        'optimization': () => window.D3Viz.initGradientDescent("#viz-gd-line", "#viz-gd-contour"),
        'diagnostics': () => window.D3Viz.initDiagnostics("#viz-diag-main", "#viz-diag-resid", "#viz-diag-qq"),
        'advanced': () => window.D3Viz.initAdvanced("#viz-multi-3d")
    };

    function activateTab(targetId) {
        // Update Nav
        navLinks.forEach(link => {
            link.classList.remove('active');
            if(link.dataset.target === targetId) link.classList.add('active');
        });

        // Update Sections
        sections.forEach(section => {
            section.classList.remove('active');
            if(section.id === targetId) {
                section.classList.add('active');

                // Initialize D3 if not already done
                if (!initializedTabs.has(targetId) && initActions[targetId]) {
                    // Small timeout to ensure DOM render (display:block) is complete before measuring width
                    setTimeout(() => {
                        // Clear any existing (just in case) and init
                        const container = section.querySelector('.visualization');
                        if(container) container.innerHTML = '';

                        initActions[targetId]();
                        initializedTabs.add(targetId);
                    }, 50);
                }
            }
        });
    }

    // Event Listeners
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            activateTab(target);
        });
    });

    // Initialize first tab (Intro has no viz, but if we start elsewhere...)
    // If we refresh on a specific anchor? No, simple SPA logic.
    // Default to intro.
    // However, if user wants to start at "Fitting", we can support hash.

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        activateTab(hash);
    } else {
        activateTab('intro');
    }
});
