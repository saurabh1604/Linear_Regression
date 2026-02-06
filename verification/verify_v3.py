import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Ensure the viewport is large enough to capture everything
        await page.set_viewport_size({"width": 1280, "height": 3500})
        await page.goto("http://localhost:8000")

        # Wait for D3 visualizations to render
        await page.wait_for_timeout(2000)

        await page.screenshot(path="verification/screenshot_v3.png", full_page=True)
        await browser.close()

asyncio.run(run())
