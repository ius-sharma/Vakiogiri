import os
import urllib.request

ASSETS = [
    {
        "name": "screen_2_vakiogiri_home",
        "image_url": "https://lh3.googleusercontent.com/aida/AP1WRLs-i2GpA-_ip3B215AlM6kiS_4eyItIkh0D13a7V-SFGK1My1KY8Wg1cMpuh3wWjVOuB_PGJEj6SuRosqvlpXxXyLU_CUCw5OqZINDBqX8_GpLWUhTS47HSZA51U7I9ZuqRoAG671uQ25jjQuHJoZ_5Zw1ff8IvGGfVpg30KV5lv5Ifv1Gkid1i39GNAVkm2jDogFUyDZ1sD1yMqM7DxQj6RspTzk9aIDiXrbQ5Bg-wuWcQyXtnhshGp6o",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OTBjMTQzYTVlYzEwMzM4NDlhOWMyMjVlNjdmEgsSBxDoiajr-xsYAZIBIwoKcHJvamVjdF9pZBIVQhM3MDIwNDU1NzMwNDI2MjA1OTEz&filename=&opi=89354086"
    },
    {
        "name": "screen_3_vakiogiri_processing",
        "image_url": "https://lh3.googleusercontent.com/aida/AP1WRLualHzT7asNhERo5WlbdZSt47R59d0DOgsAtCSg0GW3QsBjK2aSepgmSFnLvJNyy3THiE0dQ0-1EMf87XJzdeVM3FvSs6jcolIspB5Pm4umPRUgBOiZb9XAIeacnJT1rcbrqaGlRyp2MlTzMEYR2eVDgj2LDiImAD1rVhXuyXhU50ByxB8MU2otoVTJ4vRXW3wMwpf21yl69PMV3NCtkUupiA1TxNoIwAaY4QejYAYAsYOCIrJs2EMBKwU",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OTBjMDRjYzYyYjYwN2M0YzU4NzU0MGY1ZTM5EgsSBxDoiajr-xsYAZIBIwoKcHJvamVjdF9pZBIVQhM3MDIwNDU1NzMwNDI2MjA1OTEz&filename=&opi=89354086"
    },
    {
        "name": "screen_4_vakiogiri_error",
        "image_url": "https://lh3.googleusercontent.com/aida/AP1WRLsgy3vM4-UKumKnAkQOWo9ZcxT9QyZTztK6a1m2JyvDhC3CGAAmhj2fYGyU0JBghm7aqmypwr7Rk1HFgsXzA0xiPQ8UF_uhDPm2nNex905wn7QXgsgZdqOmfnSjdQgHLYChAHtqb2gyhSkLO_YtlsLuWbxU206yq964JNxe9SvLrQv79lwur7jP2wPHy5esQlitJR-VHeOFiSz_8hr5UbmiDd20RzS8NOiB2mGog9KAV26YhtkZwpE2kog",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OTBjMDRiZWQyN2MwOTM0ZDA0NjI5MzU4ZjdkEgsSBxDoiajr-xsYAZIBIwoKcHJvamVjdF9pZBIVQhM3MDIwNDU1NzMwNDI2MjA1OTEz&filename=&opi=89354086"
    },
    {
        "name": "screen_5_vakiogiri_results",
        "image_url": "https://lh3.googleusercontent.com/aida/AP1WRLt-3V3LhP2nO40ejOgCqGI6X8CCeXQy0-wKGTnsT1IsSg7YODYIgugbiakEhwgh9Yse1mI639bSRG5eRrSJpznPuUC8muxGNzMbPdo9-CqxxW_eNQ6XwrxjrdXcEGcmtt_DgTkSFglWmM9hSjbWqQj93zv93H6uEpROoVTekt99zKdPIdWTYY3TtqmHdgd13UXBVzxs-_BGIyhyknMHbF7g30Z4yU7KNrdbo7A7gOB9wZOeoPIlZnAold0",
        "html_url": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1OTBiZjk2ZGYwOWEwNzNhZjIzNWFjMmI2ZDNhEgsSBxDoiajr-xsYAZIBIwoKcHJvamVjdF9pZBIVQhM3MDIwNDU1NzMwNDI2MjA1OTEz&filename=&opi=89354086"
    }
]

OUTPUT_DIR = "c:/CLIPPING/stitch_assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

for item in ASSETS:
    img_path = os.path.join(OUTPUT_DIR, f"{item['name']}.png")
    html_path = os.path.join(OUTPUT_DIR, f"{item['name']}.html")
    
    print(f"Downloading image for {item['name']}...")
    req_img = urllib.request.Request(item['image_url'], headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_img) as response, open(img_path, 'wb') as out_file:
        out_file.write(response.read())
        
    print(f"Downloading HTML for {item['name']}...")
    req_html = urllib.request.Request(item['html_url'], headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req_html) as response, open(html_path, 'wb') as out_file:
        out_file.write(response.read())

print("All Stitch screen assets downloaded successfully!")
