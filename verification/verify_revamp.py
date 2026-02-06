from playwright.sync_api import sync_playwright
import time

def verify_revamp():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Click on "Fitting the Line" tab
        page.click("text=3. Fitting the Line")
        time.sleep(1) # Wait for animation/lazy load

        # 1. Check for "Why Squared Errors?" text
        if page.is_visible("text=Why Squared Errors?"):
            print("SUCCESS: 'Why Squared Errors?' text found.")
        else:
            print("FAILURE: 'Why Squared Errors?' text NOT found.")

        # 2. Check for Drag Handles
        handles = page.query_selector_all(".handle")
        if len(handles) >= 2:
            r = handles[0].get_attribute("r")
            if r == "12":
                 print("SUCCESS: Drag handles found with radius 12.")
            else:
                 print(f"FAILURE: Drag handles found but radius is {r} (expected 12).")
        else:
            print("FAILURE: Drag handles not found.")

        # 3. Enable Squared Errors and check style
        page.click("#toggle-squares-btn")
        time.sleep(0.5)

        squares = page.query_selector_all(".error-square")
        if len(squares) > 0:
            # Check computed style of first square
            fill = squares[0].evaluate("el => getComputedStyle(el).fill")
            print(f"Square Fill Color: {fill}")
            if "rgba(231, 76, 60, 0.25)" in fill or "rgb(231, 76, 60)" in fill: # Computed might come back as rgb if alpha handled differently or simple rgb if opacity is separate.
                # CSS is fill: rgba(231, 76, 60, 0.25). Browser usually returns rgba(231, 76, 60, 0.25).
                print("SUCCESS: Error squares found with correct red styling.")
            else:
                print(f"WARNING: Error squares found but color might be off: {fill}")
        else:
            print("FAILURE: Error squares not found after toggling.")

        page.screenshot(path="verification/revamp_verification.png")
        print("Screenshot saved to verification/revamp_verification.png")

        browser.close()

if __name__ == "__main__":
    verify_revamp()
