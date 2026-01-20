# Delete Account Feature - Visual Guide

## 🎨 User Interface Overview

### 1. Settings Page - Danger Zone Section

Located at the bottom of the Settings page, the Danger Zone section is visually distinct with:

```
┌─────────────────────────────────────────────────────────────┐
│  🛡️  Danger Zone                                            │  ← Red text
├─────────────────────────────────────────────────────────────┤  ← Red border
│                                                               │
│  Delete Account                                              │
│  Permanently delete your account and all associated data.   │
│  This action cannot be undone.                              │
│                                                              │
│  [ Delete Account ]  ← Red button                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Design Elements:**

- 🔴 Red double border (`border-2 border-red-200`)
- 🛡️ Shield icon in red circle
- 🔴 Red section title "Danger Zone"
- ⚫ Dark text for description
- 🔴 Red delete button

---

### 2. Delete Account Modal

When the user clicks "Delete Account", a modal appears:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️  Delete Account                                      ✕   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ⚠️ This action cannot be undone                        │ │  ← Red warning box
│  │                                                          │ │
│  │ Deleting your account will permanently remove:         │ │
│  │  • Your profile and account information                │ │
│  │  • All your listings and drafts                        │ │
│  │  • Analytics and performance data                      │ │
│  │  • Marketplace connections                             │ │
│  │  • AI generation history                               │ │
│  │  • Support tickets and messages                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  Type DELETE to confirm                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Type here...]                                         │ │  ← Input field
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [ Cancel ]              [ Delete Account ]                  │
│                          ↑ Disabled until "DELETE" typed     │
└──────────────────────────────────────────────────────────────┘
```

**Design Elements:**

- ⚠️ Warning triangle icon in red circle
- 🔴 Red border on warning box
- 📝 Type-to-confirm input field
- ⚫ Cancel button (gray)
- 🔴 Delete Account button (red, disabled state)

---

### 3. Modal States

#### Initial State

```
Type DELETE to confirm
┌────────────────────────────────────┐
│                                    │  ← Empty input
└────────────────────────────────────┘

[ Cancel ]     [ Delete Account ]  ← Disabled (grayed out)
```

#### Typing Wrong Text

```
Type DELETE to confirm
┌────────────────────────────────────┐
│ delete                             │  ← Wrong case
└────────────────────────────────────┘
❌ Please type "DELETE" to confirm    ← Error message

[ Cancel ]     [ Delete Account ]  ← Still disabled
```

#### Correct Input

```
Type DELETE to confirm
┌────────────────────────────────────┐
│ DELETE                             │  ← Correct!
└────────────────────────────────────┘

[ Cancel ]     [ Delete Account ]  ← Enabled (bright red)
```

#### Deleting State

```
Type DELETE to confirm
┌────────────────────────────────────┐
│ DELETE                             │  ← Disabled
└────────────────────────────────────┘

[ Cancel ]     [ Deleting... ]  ← Loading state
   ↑ Disabled      ↑ Shows spinner
```

---

### 4. Color Scheme

#### Light Mode

- **Danger Zone Border**: `border-red-200` (light red)
- **Background**: `bg-white` (white)
- **Text**: `text-dark-900` (almost black)
- **Warning Box**: `bg-red-50` with `border-red-200` (light red tint)
- **Buttons**: `bg-red-600` hover `bg-red-700` (red)
- **Icon Circle**: `bg-red-100` (very light red)

#### Dark Mode

- **Danger Zone Border**: `border-red-900` (dark red)
- **Background**: `bg-dark-900` (dark)
- **Text**: `text-dark-50` (off-white)
- **Warning Box**: `bg-red-900/10` with `border-red-800` (dark red tint)
- **Buttons**: `bg-red-600` hover `bg-red-700` (same red)
- **Icon Circle**: `bg-red-900/20` (dark red tint)

---

### 5. Layout Positioning

```
Settings Page Layout:

┌─────────────────────────────────────┐
│  Settings                            │
│  Manage your account and preferences │
├─────────────────────────────────────┤
│                                      │
│  👤 Profile                          │
│  [Profile settings...]               │
│                                      │
│  🔒 Password                         │
│  [Password settings...]              │
│                                      │
│  🔔 Notifications                    │
│  [Notification settings...]          │
│                                      │
│  🛡️ Connected Accounts               │
│  [Marketplace connections...]        │
│                                      │
│  💳 Billing                          │
│  [Billing information...]            │
│                                      │
│  ⚠️ DANGER ZONE  ← Added here       │
│  [Delete Account section]            │
│                                      │
└─────────────────────────────────────┘
```

---

### 6. Responsive Design

#### Desktop (Wide)

```
┌──────────────────────────────────────────────┐
│  Delete Account                              │
│  Permanently delete your account and all     │
│  associated data. This action cannot be      │
│  undone.                                     │
│                                              │
│  [ Delete Account ]                          │
└──────────────────────────────────────────────┘
```

#### Mobile (Narrow)

```
┌────────────────────────┐
│  Delete Account        │
│  Permanently delete    │
│  your account and all  │
│  associated data. This │
│  action cannot be      │
│  undone.              │
│                        │
│  [ Delete Account ]    │
└────────────────────────┘
```

Modal is responsive with `max-w-md` (448px max width) and `p-4` padding.

---

### 7. Interactive Elements

#### Hover States

```
Delete Account Button:
Normal:  bg-red-600       ┌──────────────────┐
                          │ Delete Account   │
                          └──────────────────┘

Hover:   bg-red-700       ┌──────────────────┐
                          │ Delete Account   │ ← Darker red
                          └──────────────────┘
```

#### Focus States

```
Input Field:
Normal:  border-dark-300  ┌──────────────────┐
                          │                  │
                          └──────────────────┘

Focus:   ring-red-500     ┌──────────────────┐
                          │ DELETE           │ ← Red glow
                          └──────────────────┘
```

---

### 8. Accessibility Features

- ✅ **Keyboard Navigation**: ESC key closes modal
- ✅ **Disabled States**: Clear visual feedback
- ✅ **Focus Indicators**: Ring on focused elements
- ✅ **Color Contrast**: WCAG AA compliant
- ✅ **Screen Readers**: Semantic HTML structure
- ✅ **Loading States**: Clear feedback during async operations

---

### 9. Animation & Transitions

```
Modal Appearance:
- Backdrop fades in with blur effect
- Modal slides/fades in
- Duration: 200ms

Button Hover:
- Color transition: 150ms
- Smooth color change

Input Focus:
- Ring appears: 200ms
- Smooth transition
```

---

### 10. Error & Success States

#### Error State

```
┌────────────────────────────────────┐
│ ❌ Please type "DELETE" to confirm │  ← Red text
└────────────────────────────────────┘
```

#### Loading State

```
┌────────────────────────────────────┐
│ [ Deleting... ] ⌛                 │  ← Spinner animation
└────────────────────────────────────┘
```

#### Success State

```
User is redirected to home page
(No success message shown as account is deleted)
```

---

## 🎯 User Experience Flow

1. **Discovery**: User scrolls to bottom of Settings
2. **Recognition**: Red border and "Danger Zone" catches attention
3. **Decision**: Reads clear warning text
4. **Action**: Clicks red "Delete Account" button
5. **Confirmation**: Modal appears with detailed warning
6. **Verification**: Must type "DELETE" to proceed
7. **Execution**: Button enables, user confirms
8. **Feedback**: "Deleting..." state shows progress
9. **Completion**: Redirected to home page, logged out

---

## 💡 Design Principles Applied

1. **Progressive Disclosure**: Warning at each step
2. **Friction by Design**: Type-to-confirm prevents accidents
3. **Clear Communication**: Lists exactly what will be deleted
4. **Visual Hierarchy**: Red indicates danger at each level
5. **Feedback**: Loading states, error messages, success redirect
6. **Accessibility**: Keyboard support, focus indicators, semantic HTML
7. **Responsive**: Works on all screen sizes

---

## 🔍 What Makes It Professional

✅ **Visual Consistency**: Matches existing design system
✅ **Color Psychology**: Red universally means danger/warning
✅ **Information Architecture**: Placed at bottom, separate from other settings
✅ **User Safety**: Multiple confirmation steps
✅ **Clear Messaging**: No ambiguity about consequences
✅ **Polish**: Smooth transitions, proper spacing, dark mode support
✅ **Reliability**: Error handling, loading states, proper feedback
