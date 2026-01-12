## *Tinder Bot AI*

### ⚙️ Overview

**Tinder Bot AI** is a Chrome Extension designed to automate repetitive actions on [tinder.com](https://tinder.com). It streamlines the swiping process, remembers previously seen profiles, and lays the groundwork for smarter chat automation and AI-powered suggestions.

---

### ✨ Features

* 🔁 **Auto-Like Bot**
  Simulates human-like delays between swipes using Gaussian randomness.
* 👁 **Profile Memory**
  Stores visited profiles (with base64-encoded pictures) to avoid duplicates.
* 🧠 **Match Overlay**
  Displays profile info and countdown during automation.
* 🛑 **Pause / Resume**
  Easily toggle the bot from the popup or by interacting manually.
* 📊 **Stats Dashboard**
  Popup shows processed profiles and browsable match history.
* 💬 **Auto-Chat (WIP)**
  Future tab for automatic message handling and AI suggestions.

---

### 📦 Installation (Developer Mode)

1. Clone or download the repository.
2. Open **chrome://extensions/**
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.

---

### 🧩 File Structure

```
├── manifest.json              # Extension metadata
├── background/background.js   # State mgmt, storage, messaging
├── content/swiper.js          # Auto-like logic
├── content/chatter.js         # Chat scraping logic (WIP)
├── popup/popup.html           # Popup UI
├── popup/popup.js             # Popup interactivity
├── popup/style.css            # Popup styling
└── images/png/...             # Extension icons
```

---

### 🔐 Permissions

* `storage` / `unlimitedStorage` — Save profile history.
* `tabs`, `activeTab`, `webNavigation`, `scripting` — Interact with Tinder pages.
* `host_permissions` — Fetch images from `images-ssl.gotinder.com`.

---

### 🚧 Roadmap

* [ ] Auto-Chat tab functionality
* [ ] AI message suggestions
* [ ] Match filtering & analytics
* [ ] Configurable decision logic

---

### ⚠️ Disclaimer

This extension is for educational or personal experimentation only. Automating Tinder may violate its Terms of Service — use responsibly and at your own risk.



Non-monogamous

"20"
"Celeste"
"https://images-ssl.gotinder.com/u/mVm2ET5u9JFCxTfVN6XsBG/w3kesvWPjNWCXyU1wL2YfX.jpg?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS9tVm0yRVQ1dTlKRkN4VGZWTjZYc0JHLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3Njg4MjE4NjJ9fX1dfQ__&Signature=bpLfWlFcNqSV0fXPai-koxTSWWSypoQGO9i8aVhIER17K3cUMjfd9um4Jn96VCjfpo6coKHXg7KvhtuLRfvKTyR2-wHBbTG9DalujRYopZkagcCdA7KqcjNcEEft42iCFuzDeNquZeNIi9AQsauWtd0ZVWUCYpLpzIARlAoqNon9pGX3Sb2yCNbWLePkeaAArWRB2i9KAG6zqM7swmD1UBgTDdKLgBhIK34fPlKpVcnIPZeMF4zLOqwhP0k0R~T8ZNyczJa4SzsGj4yRViOpXv4MwkhRNobt9CbnK0tcUFVpGR46vRuydSLhh4XCHJ1EyaYL7pR5v66BYN1-dqhiEg__&Key-Pair-Id=K368TLDEUPA6OI"

"https://images-ssl.gotinder.com/u/mVm2ET5u9JFCxTfVN6XsBG/w3kesvWPjNWCXyU1wL2YfX.jpg?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS9tVm0yRVQ1dTlKRkN4VGZWTjZYc0JHLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3Njg4MjE4NjJ9fX1dfQ__&Signature=bpLfWlFcNqSV0fXPai-koxTSWWSypoQGO9i8aVhIER17K3cUMjfd9um4Jn96VCjfpo6coKHXg7KvhtuLRfvKTyR2-wHBbTG9DalujRYopZkagcCdA7KqcjNcEEft42iCFuzDeNquZeNIi9AQsauWtd0ZVWUCYpLpzIARlAoqNon9pGX3Sb2yCNbWLePkeaAArWRB2i9KAG6zqM7swmD1UBgTDdKLgBhIK34fPlKpVcnIPZeMF4zLOqwhP0k0R~T8ZNyczJa4SzsGj4yRViOpXv4MwkhRNobt9CbnK0tcUFVpGR46vRuydSLhh4XCHJ1EyaYL7pR5v66BYN1-dqhiEg__&Key-Pair-Id=K368TLDEUPA6OI"
"https://images-ssl.gotinder.com/u/mVm2ET5u9JFCxTfVN6XsBG/w3kesvWPjNWCXyU1wL2YfX.jpg?Policy=eyJTdGF0ZW1lbnQiOiBbeyJSZXNvdXJjZSI6IiovdS9tVm0yRVQ1dTlKRkN4VGZWTjZYc0JHLyoiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3Njg4MjE4NjJ9fX1dfQ__&Signature=bpLfWlFcNqSV0fXPai-koxTSWWSypoQGO9i8aVhIER17K3cUMjfd9um4Jn96VCjfpo6coKHXg7KvhtuLRfvKTyR2-wHBbTG9DalujRYopZkagcCdA7KqcjNcEEft42iCFuzDeNquZeNIi9AQsauWtd0ZVWUCYpLpzIARlAoqNon9pGX3Sb2yCNbWLePkeaAArWRB2i9KAG6zqM7swmD1UBgTDdKLgBhIK34fPlKpVcnIPZeMF4zLOqwhP0k0R~T8ZNyczJa4SzsGj4yRViOpXv4MwkhRNobt9CbnK0tcUFVpGR46vRuydSLhh4XCHJ1EyaYL7pR5v66BYN1-dqhiEg__&Key-Pair-Id=K368TLDEUPA6OI"