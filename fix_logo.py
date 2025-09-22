#!/usr/bin/env python3
import re

# Read the file
with open('server/routes/auth.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the base64 image with URL
old_pattern = r'<img src="data:image/png;base64,[^"]*" alt="שוקו ביטוח" style="width: 24px; height: 24px;" />'
new_replacement = '<img src="https://contractor-crm-api.onrender.com/logo-256.png" alt="שוקו ביטוח" style="width: 24px; height: 24px;" />'

# Replace the pattern
new_content = re.sub(old_pattern, new_replacement, content)

# Write back to file
with open('server/routes/auth.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Logo URL updated in auth.js")

