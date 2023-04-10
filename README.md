# Kia Owner Portal Scraper

This is a Python script that uses Playwright to scrape the JSON payload from the Kia Owner Portal's trip page and modify the POST request body to get data for the past week. The response text is then saved to a specified output file.

## Usage

First, install the required dependencies using pip:

```
pip install playwright
pip install argparse
```

Then, run the script with the following command:
`python kia_scraper.py userLoginId userLoginPwd outputFile`

- `userLoginId`: The user's login ID for the Kia Owner Portal.
- `userLoginPwd`: The user's login password for the Kia Owner Portal.
- `outputFile`: The output file to save the response text in.

The script will launch a headless Chromium browser and navigate to the Kia Owner Portal. It will sign in with the provided login credentials and modify the POST request to get data for the past week. The response text will then be saved to the specified output file.

## Requirements

- Python 3.7+
- Playwright
- argparse
