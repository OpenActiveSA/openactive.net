# Why Android Package Names Start with "com"

## The "com" Convention

Android package names follow **reverse domain notation** (like Java packages). The "com" stands for **"commercial"** - it's a top-level domain (TLD) convention.

## Your Package Name Breakdown

```
com.openactive.mobile
│   │          │
│   │          └─ App name: "mobile"
│   └──────────── Organization: "openactive"
└──────────────── TLD: "com" (commercial)
```

## Why This Format?

1. **Reverse Domain Notation**: Instead of `openactive.com.mobile`, it's reversed to `com.openactive.mobile`
2. **Uniqueness**: Ensures your app has a unique identifier (like a domain name)
3. **Organization**: Groups apps by company/organization
4. **Android Standard**: Required by Google Play Store

## Common TLD Prefixes

- `com` = Commercial (most common)
- `org` = Organization (non-profit)
- `net` = Network
- `edu` = Educational
- `gov` = Government

## Can You Change It?

Yes! You can change it in `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "org.openactive.mobile"  // or any format you want
    }
  }
}
```

**But be careful:** Changing the package name means:
- It's treated as a **different app** by Android
- You'll need to uninstall the old app first
- All app data will be lost

## Your Current Setup

Your package name `com.openactive.mobile` is perfectly fine and follows Android best practices! The "com" is just a convention, not a requirement.

