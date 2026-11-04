import os

md_path = r"C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project\report\main_report.md"
html_path = r"C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project\report\main_report.html"

with open(md_path, "r", encoding="utf-8") as f:
    text = f.read()

try:
    import markdown
    html_body = markdown.markdown(text, extensions=["tables", "fenced_code"])
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown"])
    import markdown
    html_body = markdown.markdown(text, extensions=["tables", "fenced_code"])

css = """
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; max-width: 950px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; background-color: #fff; }
h1 { color: #0a3d62; font-size: 26px; border-bottom: 2px solid #0a3d62; padding-bottom: 12px; margin-top: 30px; }
h2 { color: #1e3799; font-size: 20px; border-bottom: 1px solid #dcdde1; padding-bottom: 8px; margin-top: 26px; }
h3 { color: #2f3640; font-size: 16px; margin-top: 20px; }
table { border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; }
th, td { border: 1px solid #dcdde1; padding: 10px 14px; text-align: left; }
th { background-color: #f1f2f6; font-weight: 600; color: #2f3542; }
tr:nth-child(even) { background-color: #f8f9fa; }
code { background-color: #f1f2f6; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; font-size: 13px; }
pre code { display: block; padding: 14px; overflow-x: auto; background-color: #2f3542; color: #f1f2f6; border-radius: 6px; }
blockquote { border-left: 4px solid #4a69bd; padding: 0 15px; color: #57606f; margin: 0; }
hr { border: 0; height: 1px; background: #e1e2e6; margin: 30px 0; }
</style>
"""

full_html = f"<!DOCTYPE html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n<title>Comparative CSTR and PFR Design</title>\n{css}\n</head>\n<body>\n{html_body}\n</body>\n</html>"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(full_html)

print("HTML report successfully generated at:", html_path)
