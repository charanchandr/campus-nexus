# 🔐 MFA Code Access Guide

## ✅ UPDATED: Easy MFA Code Access

The app has been updated to show the MFA code **directly in the browser**!

### How to Get Your MFA Code (NEW):

1. **Enter your credentials** on the login page
2. Click **"Sign In"**
3. When the MFA screen appears, **look at the bottom-right corner** of your screen
4. You'll see a **notification toast** that says:
   ```
   🔐 MFA Code: ABC123 (Check this notification!)
   ```
5. **Copy that code** and paste it into the MFA input field
6. Click **"Verify & Proceed"**

---

## Alternative Method (Terminal):

If you want to see it in the terminal (for demonstration purposes):

1. Find the **Command Prompt/Terminal** window where `python app.py` is running
2. After you click "Sign In", scroll up slightly to find:
   ```
   --- [MFA SIMULATION] ---
   Code for CB.SC.U4CSE23332: ABC123
   ------------------------
   ```

---

## For Your Lab Evaluation:

During your presentation, you can explain:

> "In a production environment, this 6-character code would be sent via **email** or **SMS** to the user's registered contact. For this lab demonstration, I'm simulating the delivery by displaying it as a notification."

This demonstrates your understanding of **NIST SP 800-63-2** Multi-Factor Authentication without requiring actual email infrastructure.

---

## Troubleshooting:

**Q: I don't see the notification**  
A: Make sure you clicked "Sign In" with valid credentials. The notification appears for 8 seconds.

**Q: The code doesn't work**  
A: Try logging in again. Each login generates a unique MFA code that's tied to your account.

**Q: Can I change the code?**  
A: Yes! When you register, a random 6-character code is generated. If you want a specific code for testing, you can modify the database directly.

---

**Pro Tip**: The notification stays visible for **8 seconds** (instead of the usual 3) to give you time to copy the code!
