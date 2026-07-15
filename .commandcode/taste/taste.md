# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# architecture
- For low-powered kiosk/tablet devices (~2GB RAM), design must balance streaming efficiency with local resilience — streaming-only approaches fail when the device has internet problems or powercuts. Confidence: 0.65

# kiosk
- Setup screen must show clear real-time connection status and confirmation before allowing setup to complete. Confidence: 0.75
- After setup completes, show a progress screen for ads and menu downloads before transitioning to the ad player (initial setup only). Confidence: 0.70
- Kiosk unlock via admin password should navigate to the settings page instead of just showing "kiosk mode unlocked" message. Confidence: 0.75
- Navigation buttons should only be accessible from setup and settings screens, not during kiosk/ad player mode. Confidence: 0.80

