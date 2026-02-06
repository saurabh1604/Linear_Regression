from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/index.html")

        # Wait for D3 and Plotly to render
        page.wait_for_timeout(3000)

        # Scroll to ensure everything loads/animates
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1000)

        # Take a full page screenshot
        page.screenshot(path="verification/screenshot_v2.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()
