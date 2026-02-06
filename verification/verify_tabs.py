from playwright.sync_api import sync_playwright
import time

def verify_tabs():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 1024})

        print("Navigating to home...")
        page.goto("http://localhost:8000")
        time.sleep(1)
        page.screenshot(path="verification/tab_1_intro.png")
        print("Captured Intro tab.")

        print("Clicking Fitting tab...")
        page.click("a[data-target='fitting']")
        time.sleep(1)
        # Check if D3 rendered (regression line exists)
        if page.locator("#viz-fitting .regression-line").count() > 0:
            print("Fitting Viz Rendered.")
        else:
            print("ERROR: Fitting Viz NOT Rendered.")
        page.screenshot(path="verification/tab_2_fitting.png")
        print("Captured Fitting tab.")

        print("Clicking Diagnostics tab...")
        page.click("a[data-target='diagnostics']")
        time.sleep(1)
        # Check if Diagnostics rendered
        if page.locator("#viz-diag-main .regression-line").count() > 0:
            print("Diagnostics Viz Rendered.")
        else:
            print("ERROR: Diagnostics Viz NOT Rendered.")
        page.screenshot(path="verification/tab_3_diagnostics.png")
        print("Captured Diagnostics tab.")

        browser.close()

if __name__ == "__main__":
    verify_tabs()
