# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# architecture
- For low-powered kiosk/tablet devices (~2GB RAM), design must balance streaming efficiency with local resilience — streaming-only approaches fail when the device has internet problems or powercuts. Confidence: 0.65

# kiosk
- Setup screen must show clear real-time connection status and confirmation before allowing setup to complete. Confidence: 0.75
- After setup completes, show a progress screen for ads and menu downloads before transitioning to the ad player (initial setup only). Confidence: 0.70
- Kiosk unlock via admin password should navigate to the settings page instead of just showing "kiosk mode unlocked" message. Confidence: 0.75
- Navigation buttons should only be accessible from setup and settings screens, not during kiosk/ad player mode. Confidence: 0.80

# kiosk
See [kiosk/taste.md](kiosk/taste.md)
# payment
- Payments and orders must be logged in a dedicated "Payment" section of the merchant dashboard, separate from the Live Orders tab. Confidence: 0.75
- Ads must not play during "Close Table" mode and resume only after "Payment Received" is clicked. Confidence: 0.75

# privacy
- For sensitive third-party credentials (e.g., PhonePe merchant IDs), design for in-app self-service input by the venue owner rather than requiring them to share credentials with developers. Confidence: 0.70

