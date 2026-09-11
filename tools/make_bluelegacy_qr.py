import qrcode
from pathlib import Path

url = "https://lts4all.github.io/bluelegacy-social/legacy.html?v=legacy1"
out = Path("/home/ubuntu/bluelegacy-social/client/public/bluelegacy-qr.png")
qr = qrcode.QRCode(version=4, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=8, border=4)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")
img.save(out)
print(out)
