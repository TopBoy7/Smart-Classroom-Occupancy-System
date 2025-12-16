import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

logger = logging.getLogger(__name__)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587

# 🔐 Load from environment
SENDER_EMAIL = os.getenv("SMTP_EMAIL")
SENDER_PASSWORD = os.getenv("SMTP_PASSWORD")

print(SENDER_EMAIL, SENDER_PASSWORD)

if not SENDER_EMAIL or not SENDER_PASSWORD:
    raise RuntimeError("SMTP_EMAIL or SMTP_PASSWORD not set in environment variables")


def send_occupancy_alert(
    to_email: str,
    class_id: str,
    class_name: str,
    occupancy: int,
    capacity: int
):

    subject = f"⚠️ Capacity Alert: {class_name} ({class_id})"

    body = f"""
    <html>
    <body>
        <h3>Classroom Capacity Exceeded</h3>
        <p>
            The classroom <strong>{class_name}</strong> (ID: {class_id})
            has exceeded its allowed capacity.
        </p>
        <p>
            <strong>Occupancy:</strong> {occupancy}<br>
            <strong>Capacity:</strong> {capacity}
        </p>
        <p>
            Please take immediate action.
        </p>
        <br>
        <p>Smart Classroom System</p>
    </body>
    </html>
    """

    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    server = None
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=30)
        server.ehlo()
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
    except Exception as e:
        logger.exception("Failed to send occupancy alert email: %s", e)
    finally:
        if server:
            server.quit()