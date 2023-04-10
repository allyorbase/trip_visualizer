import argparse
import asyncio
from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta


def run(playwright, user_login_id, user_login_pwd, output_file):
    """
    Sign in to the Kia Owner Portal, modify the POST request for the past week, and save the response to the output file.
    
    :param playwright: The playwright object used to interact with the browser.
    :param user_login_id: The user's login ID for the Kia Owner Portal.
    :param user_login_pwd: The user's login password for the Kia Owner Portal.
    :param output_file: The output file to save the response text in.
    """
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Set up Playwright to sign in to the Kia Owner Portal
    page.goto("https://owners.kia.com/us/en/kia-owner-portal.html")
    page.click("text=Sign In")
    page.click("input[name='userLoginId']")
    page.fill("input[name='userLoginId']", user_login_id)
    page.fill("input[name='userLoginPwd']", user_login_pwd)
    page.click("li:nth-child(3) em")
    page.click(".sign-in")

    page.wait_for_selector("div.overview-remote-command")
    page.click(f"a[href='/content/owners/en/locations.html?page=360-view']")

    page.wait_for_selector(".trip-tab")

    # Calculate the past week's dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    def handle_request(route, request):
        if request.url.endswith("trip.html") and request.method == "POST":
            # Modify the request data to include the past week
            json_data = request.post_data_json
            json_data['dateRange']['startDate'] = start_date.strftime('%Y%m%d')
            json_data['dateRange']['endDate'] = end_date.strftime('%Y%m%d')

            # Continue the request with the modified data
            route.continue_(headers=request.headers, method=request.method, post_data=json_data)
        else:
            route.continue_()

    page.route("**/*trip.html", handle_request)

    # Use expect_response to wait for the specific response
    with page.expect_response("**/*trip.html") as response_info:
        page.click(".trip-tab")

    # Get the response object
    response = response_info.value

    response_text = response.text()

    # Save the response text to the output file
    with open(output_file, 'w') as f:
        f.write(response_text)

    browser.close()


if __name__ == "__main__":
    # Define the command-line argument parser
    parser = argparse.ArgumentParser(description="Scrape JSON payload from a webapp using Playwright and modify the POST request body.")
    parser.add_argument("userLoginId", help="User login ID for the Kia Owner Portal.")
    parser.add_argument("userLoginPwd", help="User login password for the Kia Owner Portal.")
    parser.add_argument("outputFile", help="Output file to save the response text in.")
    
    # Parse the command-line arguments
    args = parser.parse_args()

    # Run the program with the given command-line arguments
    with sync_playwright() as playwright:
        run(playwright, args.userLoginId, args.userLoginPwd, args.outputFile)
