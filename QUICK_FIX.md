# ⚡ QUICK FIX REFERENCE

## 🔧 **3 ISSUES → 3 FIXES**

### **Issue 1:** Login Token Error ❌
```
Error: "Cannot read property 'accessToken' of undefined"
```
**Fix:** Changed backend response field from `token` to `accessToken` ✅

---

### **Issue 2:** Registration Error ❌
```
Error: "User already exists" (even when doesn't exist)
```
**Fix:** Separate checks for email and phone with specific messages ✅

---

### **Issue 3:** Google Login Error ❌
```
Error: "Google Sign-In configuration error. Check Client ID and SHA-1"
```
**Fix:** Consistent token naming and better error handling ✅

---

## 🚀 **DEPLOY IN 30 SECONDS**

```bash
cd madadgar/madadgar_backend
git add . && git commit -m "Fix auth issues" && git push origin main
```

Wait 2-3 minutes → Test on phone → Done! ✅

---

## ✅ **FILES CHANGED**

```
1. utils/jwt.js              → Token field name
2. controllers/authController.js  → Auth logic
3. models/User.js            → Google ID storage
```

---

## 📱 **TEST CHECKLIST**

```
□ Login with email/password
□ Register with new account
□ Try duplicate email
□ Try duplicate phone
□ Google Sign-In
□ All working!
```

---

**That's it! Deploy and test! 🎉**
