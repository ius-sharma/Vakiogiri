import os
import shutil

SOURCE_PAGE = "C:/CLIPPING/frontend/src/app/page.tsx"
SOURCE_CSS = "C:/CLIPPING/frontend/src/app/globals.css"
SOURCE_LAYOUT = "C:/CLIPPING/frontend/src/app/layout.tsx"

TARGET_DIRS = [
    "C:/CLIPPING/frontend/app",
    "C:/CLIPPING/frontend/src/app",
    "C:/Users/sharm/OneDrive/Desktop/CLIPPING/frontend/app",
    "C:/Users/sharm/OneDrive/Desktop/CLIPPING/frontend/src/app"
]

for target_dir in TARGET_DIRS:
    os.makedirs(target_dir, exist_ok=True)
    shutil.copy2(SOURCE_PAGE, os.path.join(target_dir, "page.tsx"))
    shutil.copy2(SOURCE_CSS, os.path.join(target_dir, "globals.css"))
    shutil.copy2(SOURCE_LAYOUT, os.path.join(target_dir, "layout.tsx"))
    print(f"Synced files to {target_dir}")

# Clear .next cache folders
for next_dir in ["C:/CLIPPING/frontend/.next", "C:/Users/sharm/OneDrive/Desktop/CLIPPING/frontend/.next"]:
    if os.path.exists(next_dir):
        try:
            shutil.rmtree(next_dir)
            print(f"Cleared cache: {next_dir}")
        except Exception as e:
            print(f"Could not clear {next_dir}: {e}")

print("Sync and cache cleanup completed successfully!")
