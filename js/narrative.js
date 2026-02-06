document.addEventListener('DOMContentLoaded', () => {
    // Scroll Spy for Sidebar
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('#sidebar a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(a => {
            a.classList.remove('active');
            if (a.getAttribute('href').includes(current)) {
                a.classList.add('active');
            }
        });
    });

    // Initialize D3 Visualizations
    if(window.D3Viz) {
        window.D3Viz.initBaseline("#viz-baseline");
        window.D3Viz.initFitting("#viz-fitting");
        window.D3Viz.initGradientDescent("#viz-gd-line", "#viz-gd-contour");
        window.D3Viz.initDiagnostics("#viz-diag-main", "#viz-diag-resid", "#viz-diag-qq");
        window.D3Viz.initAdvanced("#viz-multi-3d");
    }
});
