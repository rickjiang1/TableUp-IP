# Pantry Pilot iOS

Native SwiftUI scaffold for the Pantry Pilot app.

## Current State

This folder contains the Swift source files for the native iOS app:

- SwiftUI tab app
- SwiftData local storage
- Grocery scan screen
- Manual ingredient entry
- Storage categories and editable expiration dates
- Storage recommendations
- Recipe entry
- Can Cook matching
- Adjustable almost-cook threshold
- Cooking mode with automatic subtraction

## Create the Xcode Project

On your Mac:

1. Open Xcode.
2. Create a new **iOS App** project.
3. Product Name: `PantryPilot`
4. Interface: `SwiftUI`
5. Language: `Swift`
6. Minimum iOS: `17.0` or newer, because this scaffold uses SwiftData.
7. Copy the files in this `ios/PantryPilot` folder into the Xcode app target.
8. Make sure all copied files are checked under **Target Membership** for the app.
9. Build and run on simulator first.

## AI Backend Connection

The app should call the backend in `../backend` for AI extraction. Do not put an OpenAI API key inside the iOS app.

Backend endpoints:

```text
POST /api/extract-grocery-photo
POST /api/parse-recipe
```

The scan screen uploads the selected image to `POST /api/extract-grocery-photo` as multipart form data with the field name `photo`. The OpenAI API key belongs only in `backend/.env`; it is not used by the iOS app.

## Cloud Storage

Default is local-only SwiftData. Settings includes cloud choices for later:

- Local only
- Supabase
- Firebase
- iCloud

Cloud sync is intentionally not wired yet. Local first keeps the self-use version simple and reliable.
