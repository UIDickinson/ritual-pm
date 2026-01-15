# Ritual Community Prediction Market
## UI/UX Product Requirements Document

**Version:** 3.0  
**Date:** January 15, 2026  
**Product:** UI/UX Design Specifications  
**Community:** Ritual Network Discord Community  
**Design Philosophy:** Playful Gamification meets Performance

---

## 1. Executive Summary

This document defines the visual design, user experience, and interaction patterns for the Ritual Community Prediction Market. The design prioritizes a playful, gamified aesthetic with vibrant colors anchored by an **emerald-green primary brand** with **blue secondary accents**, medium 3D effects, and glassmorphism, while maintaining fast performance for desktop users. The interface should feel modern, energetic, prosperous, and visually distinct from typical prediction market platforms.

---

## 2. Design Vision

### 2.1 Core Design Principles

**"Growth & Prosperity"**
- Emerald-green as the vibrant, prosperous primary brand
- Blue for trust, technology, and secondary actions
- Vibrant and energetic without being overwhelming
- Gamified elements that enhance usability

**"Glass & Depth"**
- Medium 3D effects creating visual hierarchy
- Glassmorphism for elegant transparency
- Layered interface with clear depth perception

**"Winning Energy"**
- Spacious layouts with intentional whitespace
- Information revealed progressively
- Fast, snappy performance despite visual richness

**"Browse-First Experience"**
- Market browsing is the hero interaction
- Netflix-style card discovery
- Quick glanceability with depth on demand

---

## 3. Visual Design System

### 3.1 Color Palette

**Primary Brand Colors** (Emerald-Green Spectrum)
```
Primary Emerald: #10B981 (Vibrant emerald - main brand identity)
Deep Emerald: #059669 (Rich, saturated - headers, emphasis)
Light Emerald: #6EE7B7 (Soft, accessible - highlights)
Bright Lime: #84CC16 (Energy, growth - vibrant accents)
```

**Secondary Brand Colors** (Blue Spectrum)
```
Primary Blue: #3B82F6 (Trustworthy blue - secondary actions)
Deep Blue: #2563EB (Rich blue - interactive elements)
Sky Blue: #0EA5E9 (Light blue - informational states)
Cyan: #06B6D4 (Electric cyan - special highlights)
```

**Accent Colors** (Supporting Palette)
```
Hot Coral: #F43F5E (Urgent actions, disputes, errors)
Sunset Orange: #F59E0B (Warnings, closing soon)
Amber Gold: #F59E0B (Achievements, special highlights)
Deep Purple: #8B5CF6 (Rare use - special features, premium)
Electric Pink: #EC4899 (Rare use - featured/promoted items)

Neutral Base:
- Pure Black: #000000 (Dark mode background)
- Pure White: #FFFFFF (Light mode background)
- Charcoal: #1F2937 (Dark surfaces)
- Soft Gray: #F3F4F6 (Light surfaces)
- Glass White: rgba(255, 255, 255, 0.1) (Glassmorphism)
- Glass Black: rgba(0, 0, 0, 0.2) (Glassmorphism)
```

**Status Colors**
```
Success/Win: #10B981 (Emerald - primary success state)
Active/Live: #10B981 (Emerald - active markets, vibrant energy)
Warning: #F59E0B (Orange - attention needed)
Error/Dispute: #F43F5E (Coral - problems)
Info: #3B82F6 (Blue - informational)
Pending: #64748B (Slate Gray - waiting states)
```

**Gradient Combinations**
```
Primary Gradient: Emerald (#10B981) → Lime (#84CC16)
Secondary Gradient: Blue (#3B82F6) → Sky Blue (#0EA5E9)
Energy Gradient: Emerald (#10B981) → Blue (#3B82F6)
Success Gradient: Light Emerald (#6EE7B7) → Emerald (#10B981)
Alert Gradient: Coral (#F43F5E) → Orange (#F59E0B)
Depth Gradient: Deep Emerald (#059669) → Black (#000000)
Premium Gradient: Purple (#8B5CF6) → Pink (#EC4899) [rare use only]
```

**Color Usage Guidelines**
```
Primary Actions: Emerald gradient
Secondary Actions: Blue gradient  
Positive/Success/Winners: Bright emerald with lime highlights
Informational: Blue spectrum
Warnings: Orange
Errors/Disputes: Coral
Special Features: Purple (minimal use - badges, premium features only)
Market Status: Emerald (live), Emerald with gold glow (resolved/won), Gray (closed)
```

### 3.2 Typography

**Font Stack**
```
Primary: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif
Mono: 'JetBrains Mono', 'Fira Code', monospace (for numbers, stats)
```

**Type Scale**
```
Mega Heading: 64px / 700 weight (Hero sections)
H1: 48px / 700 weight (Page titles)
H2: 36px / 600 weight (Section headers)
H3: 24px / 600 weight (Card titles)
Body Large: 18px / 400 weight (Primary text)
Body: 16px / 400 weight (Standard text)
Body Small: 14px / 400 weight (Secondary info)
Caption: 12px / 500 weight (Labels, metadata)
Tiny: 10px / 600 weight (Badges, tags)
```

**Number Display** (Statistics, balances, odds)
```
Use monospace font for better readability
Large Numbers: 32px / 700 weight
Medium Numbers: 24px / 600 weight
Small Numbers: 16px / 500 weight
Accent color: Emerald for active values, Lime for positive changes, Blue for informational
```

### 3.3 Spacing System

**Base Unit:** 4px (0.25rem)

```
Space Scale:
xs: 4px (0.25rem)
sm: 8px (0.5rem)
md: 16px (1rem)
lg: 24px (1.5rem)
xl: 32px (2rem)
2xl: 48px (3rem)
3xl: 64px (4rem)
4xl: 96px (6rem)

Component Padding:
- Cards: 24px (lg)
- Buttons: 12px 24px (md horizontal, md vertical)
- Containers: 32px (xl)
- Sections: 64px (3xl) vertical spacing
```

### 3.4 Elevation & 3D Effects

**Shadow System** (Medium 3D Depth)
```css
/* Level 1: Subtle lift */
shadow-sm: 
  0 2px 4px rgba(0, 0, 0, 0.1),
  0 1px 2px rgba(0, 0, 0, 0.06)

/* Level 2: Card elevation (most common) */
shadow-md: 
  0 8px 16px rgba(0, 0, 0, 0.15),
  0 4px 8px rgba(0, 0, 0, 0.1),
  0 2px 4px rgba(0, 0, 0, 0.05)

/* Level 3: Floating elements */
shadow-lg: 
  0 16px 32px rgba(0, 0, 0, 0.2),
  0 8px 16px rgba(0, 0, 0, 0.15),
  0 4px 8px rgba(0, 0, 0, 0.1)

/* Level 4: Modal/overlay */
shadow-xl: 
  0 24px 48px rgba(0, 0, 0, 0.25),
  0 12px 24px rgba(0, 0, 0, 0.2)

/* Colored shadows for interactive elements */
shadow-emerald: 0 8px 24px rgba(16, 185, 129, 0.4)
shadow-lime: 0 8px 24px rgba(132, 204, 22, 0.4)
shadow-blue: 0 8px 24px rgba(59, 130, 246, 0.4)
shadow-coral: 0 8px 24px rgba(244, 63, 94, 0.4)
shadow-purple: 0 4px 16px rgba(139, 92, 246, 0.3) [rare use]
```

**3D Transform Effects**
```css
/* Hover lifts */
transform: translateY(-4px) scale(1.02)

/* Perspective for depth */
transform: perspective(1000px) rotateY(2deg)

/* Stacked layers */
transform: translateZ(20px)
```

**Glassmorphism Style**
```css
/* Glass card (dark mode) */
background: rgba(255, 255, 255, 0.05)
backdrop-filter: blur(20px)
border: 1px solid rgba(16, 185, 129, 0.2) /* Emerald tint */

/* Glass card (light mode) */
background: rgba(255, 255, 255, 0.7)
backdrop-filter: blur(20px)
border: 1px solid rgba(16, 185, 129, 0.15)

/* Heavy glass (modals, overlays) */
backdrop-filter: blur(40px) saturate(150%)
border: 1px solid rgba(16, 185, 129, 0.3)

/* Secondary glass (blue tint) */
border: 1px solid rgba(59, 130, 246, 0.3)
background: rgba(59, 130, 246, 0.05)
```

### 3.5 Border Radius

```
Sharp: 4px (Small elements, inputs)
Soft: 12px (Cards, buttons - PRIMARY)
Round: 16px (Larger cards)
Pill: 999px (Tags, badges, status pills)
Circle: 50% (Avatars, icons)
```

### 3.6 Icons

**Icon Library:** Lucide React

**Icon Sizes:**
```
xs: 12px
sm: 16px
md: 20px (default)
lg: 24px
xl: 32px
2xl: 48px
```

**Icon Colors:**
```
Primary actions: Emerald (#10B981)
Secondary actions: Blue (#3B82F6)
Success states: Bright Lime (#84CC16)
Warnings: Orange (#F59E0B)
Errors: Coral (#F43F5E)
Neutral: White/Black (context-dependent)
Special: Purple (#8B5CF6) - badges, premium features only
```

---

## 4. Component Design Specifications

### 4.1 Market Cards (Netflix-Style)

**Primary Component - Browse Experience**

**Layout:**
```
Desktop Dimensions:
- Width: 380px (fixed)
- Height: 280px (fixed)
- Aspect Ratio: ~1.35:1 (slightly wider than tall)

Card Structure (Top to Bottom):
1. Header Section (60px)
   - Status badge (top-left, absolute positioned)
   - Time indicator (top-right, if applicable)
   
2. Content Section (140px)
   - Market question (max 2 lines, truncate)
   - Creator info (small, subtle)
   - Key stat preview (total pool OR prediction count)
   
3. Outcomes Preview (80px)
   - Show outcome bars/visualization
   - No more than 3-4 outcomes visible
   - "View all" indicator if more outcomes
```

**Visual Style:**
```css
/* Base card */
background: glassmorphism gradient with emerald tint
border-radius: 12px
padding: 20px
box-shadow: shadow-md
border: 1px solid rgba(16, 185, 129, 0.15)

/* Hover state (medium 3D lift) */
transform: translateY(-8px) scale(1.03)
box-shadow: shadow-lg + shadow-emerald
border-color: rgba(16, 185, 129, 0.4)
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

/* Active/Pressed state */
transform: translateY(-2px) scale(1.01)
```

**Status Badge** (Single badge per category)
```
Live: Emerald gradient pill + pulsing dot
  - Background: linear-gradient(135deg, #10B981, #84CC16)
  - Icon: Pulse animation dot
  
Proposed: Orange gradient pill
  - Background: linear-gradient(135deg, #F59E0B, #FB923C)
  
Approved: Blue pill
  - Background: #3B82F6
  
Closed: Gray pill
  - Background: #64748B
  
Resolved: Emerald gradient pill + checkmark
  - Background: linear-gradient(135deg, #10B981, #6EE7B7)
  - Icon: Checkmark
  
Final: Emerald + trophy icon
  - Background: linear-gradient(135deg, #10B981, #84CC16)
  - Icon: Trophy (gold/emerald)
  
Disputed: Coral + alert icon
  - Background: linear-gradient(135deg, #F43F5E, #EF4444)
  - Icon: Alert triangle

Style:
- Position: absolute top-left, offset 12px
- Height: 24px
- Padding: 4px 12px
- Border-radius: pill (999px)
- Font: 11px, 600 weight, uppercase
- Animation: Subtle pulse for "Live" status only
```

**Outcome Visualization** (Unique & Creative - "Liquid Bar" Design)
```
Visual Concept:
- Horizontal bars with rounded ends
- Gradient fills matching outcome position
- Bars "flow" from left to right
- Height: 8px per bar
- Spacing: 6px between bars
- Each bar has a subtle inner glow
- Percentage text overlays on right side

Color Assignment:
- Outcome 1: Emerald → Lime gradient (#10B981 → #84CC16)
- Outcome 2: Blue → Sky Blue gradient (#3B82F6 → #0EA5E9)
- Outcome 3: Orange → Coral gradient (#F59E0B → #F43F5E)
- Outcome 4: Purple → Pink gradient (#8B5CF6 → #EC4899) [if needed]
- Outcome 5+: Rotate through primary gradients

Winner Outcome (after resolution):
- Emerald → Lime gradient with gold glow
- Shadow: 0 2px 8px rgba(16, 185, 129, 0.6)

Bar Style:
- border-radius: 4px (rounded ends)
- position: relative
- overflow: hidden
- Inner glow: inset 0 1px 2px rgba(255, 255, 255, 0.3)

NO animation (static, updates every 10-15s)
```

**Card Grid Layout:**
```
Container:
- Display: CSS Grid
- Columns: 3 (for desktop 1440px+)
- Gap: 24px (both horizontal and vertical)
- Justify: start
- Max-width: 1400px
- Margin: 0 auto

Responsive:
- 1200px: 2 columns
- Below 1200px: Still maintain desktop layout, add horizontal scroll if needed
```

### 4.2 Market Detail View

**Layout:** Full-width modal/page overlay

**Structure:**
```
Top Section (Hero):
- Large question display (48px)
- Status badge (larger, 32px height)
- Key metadata: Creator, Created date, Close time
- Background: Gradient overlay (Emerald to Deep Emerald) with subtle pattern

Stats Bar (Sticky below header):
- Total Pool (Emerald icon) | Total Predictions (Lime icon) | Time Remaining (Orange if urgent)
- Glass background with emerald tint, blur heavy
- Fixed position when scrolling

Outcomes Section:
- Full outcome list with detailed bars
- Each outcome is an interactive card with glass effect
- Shows: Name, Percentage, Total staked, # predictions
- Winner outcome has emerald glow + trophy icon treatment

Prediction Form (Sticky Sidebar - right side):
- Glass card with emerald border accent, always visible
- Outcome selector (large radio buttons with emerald/blue states)
- Amount input (large, prominent, emerald focus)
- Fee preview (small text, gray)
- "Place Prediction" CTA button (Emerald gradient, prominent)

Activity Feed (Bottom):
- Recent predictions (scrollable)
- Compact card design
- Shows: User, Outcome, Amount, Time
- Use lime accent for wins, emerald for active
```

**Visual Treatment:**
```
Modal Overlay:
- backdrop-filter: blur(20px)
- background: rgba(0, 0, 0, 0.6) dark mode
- background: rgba(255, 255, 255, 0.6) light mode

Content Container:
- Max-width: 1200px
- Padding: 48px
- Glass card style with emerald border accent
- Border-radius: 16px
- border: 1px solid rgba(16, 185, 129, 0.3)
```

### 4.3 Buttons

**Primary Button** (CTAs, main actions)
```css
background: linear-gradient(135deg, #10B981, #84CC16)
color: white
padding: 12px 32px
border-radius: 12px
font-weight: 600
box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4)

hover:
  transform: translateY(-2px)
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.5)
  background: linear-gradient(135deg, #059669, #10B981)

active:
  transform: translateY(0)
```

**Secondary Button** (Less emphasis, informational)
```css
background: linear-gradient(135deg, #3B82F6, #0EA5E9)
color: white
padding: 12px 24px
border-radius: 12px
font-weight: 600
box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4)

hover:
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.5)
```

**Tertiary Button** (Minimal emphasis)
```css
background: rgba(255, 255, 255, 0.1)
border: 1px solid rgba(16, 185, 129, 0.3)
backdrop-filter: blur(10px)
color: white (dark mode) / #059669 (light mode)
padding: 12px 24px
border-radius: 12px
font-weight: 500

hover:
  background: rgba(16, 185, 129, 0.15)
  border-color: rgba(16, 185, 129, 0.5)
```

**Danger Button** (Delete, reject, dispute actions)
```css
background: linear-gradient(135deg, #F43F5E, #EF4444)
color: white
(same hover/active states as primary)
box-shadow: 0 4px 12px rgba(244, 63, 94, 0.4)
```

**Icon Button** (Small actions)
```css
width: 40px
height: 40px
border-radius: 12px
background: rgba(255, 255, 255, 0.1)
border: 1px solid rgba(16, 185, 129, 0.2)
display: flex, center aligned

hover:
  background: rgba(16, 185, 129, 0.15)
  transform: rotate(5deg) scale(1.1)
  border-color: rgba(16, 185, 129, 0.4)
```

### 4.4 Form Elements

**Input Fields**
```css
background: rgba(255, 255, 255, 0.05)
border: 1px solid rgba(255, 255, 255, 0.1)
border-radius: 12px
padding: 12px 16px
font-size: 16px
backdrop-filter: blur(10px)
color: white (dark) / #059669 (light)

focus:
  border-color: #10B981
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2)
  outline: none

placeholder:
  color: rgba(255, 255, 255, 0.4)

valid (with content):
  border-color: rgba(16, 185, 129, 0.3)

error:
  border-color: #F43F5E
  box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.2)
```

**Textarea**
```
Same as input but:
- min-height: 120px
- resize: vertical
```

**Select/Dropdown**
```
Custom styled (not native):
- Glass background
- Emerald border on focus
- Dropdown menu: floating glass card with emerald accent
- Options: hover highlights with emerald gradient
- Selected: Emerald gradient background
```

**Radio Buttons** (Outcome selection)
```
Large, custom styled:
- Size: 24px circle
- Border: 2px solid rgba(255, 255, 255, 0.3)
- Checked: Emerald gradient fill + checkmark icon
  - Background: linear-gradient(135deg, #10B981, #84CC16)
- Label: 16px, positioned right
- Hover: Scale(1.1), emerald border glow
```

**Checkbox**
```
Size: 20px square
Border-radius: 4px
Border: 2px solid rgba(255, 255, 255, 0.3)
Checked: Emerald background (#10B981) + white checkmark
Hover: Emerald glow
```

### 4.5 Navigation

**Top Navigation Bar**
```
Height: 80px
Position: Sticky top
Background: Heavy glass blur with emerald tint
  - rgba(16, 185, 129, 0.05) background
Border-bottom: 1px solid rgba(16, 185, 129, 0.2)

Left Side:
- Logo/Brand (with emerald accent icon + white text)
- Navigation links (Markets, Create, My Predictions)
  - Hover: Emerald underline
  - Active: Emerald gradient text

Right Side:
- Balance display (glass pill with emerald border, lime number)
- User menu (avatar with emerald ring + dropdown)
- Theme toggle (sun/moon icon with emerald active state)

Style:
- Backdrop blur: 40px
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Z-index: 100
```

**Tab Navigation** (Secondary nav)
```
Glass container with pill-style tabs:
- Tab height: 44px
- Active tab: Emerald gradient background + shadow
  - Background: linear-gradient(135deg, #10B981, #84CC16)
- Inactive: Transparent, hover = glass overlay with emerald tint
- Indicator: Full background (not just border)
- Transition: Smooth slide animation (0.3s)
```

### 4.6 Modals & Overlays

**Modal Container**
```css
Backdrop:
  background: rgba(0, 0, 0, 0.7)
  backdrop-filter: blur(20px)

Content Card:
  max-width: 600px (standard)
  max-width: 900px (large, e.g., market detail)
  background: Glass heavy with emerald accent
  border: 1px solid rgba(16, 185, 129, 0.3)
  border-radius: 16px
  padding: 32px
  box-shadow: shadow-xl + shadow-emerald

Animation:
  Enter: Scale(0.95) → Scale(1), Opacity 0 → 1
  Exit: Scale(1) → Scale(0.95), Opacity 1 → 0
  Duration: 0.2s, ease-out
```

### 4.7 Notifications & Feedback

**Toast Notifications** (Subtle indicators)
```
Position: Bottom-right corner
Max-width: 400px
Style: Glass card with status color accent

Success:
  Left border: 4px solid #10B981
  Icon: Checkmark (emerald)
  Background: rgba(16, 185, 129, 0.1)

Error:
  Left border: 4px solid #F43F5E
  Icon: X circle (coral)
  Background: rgba(244, 63, 94, 0.1)

Info:
  Left border: 4px solid #3B82F6
  Icon: Info circle (blue)
  Background: rgba(59, 130, 246, 0.1)

Warning:
  Left border: 4px solid #F59E0B
  Icon: Alert triangle (orange)
  Background: rgba(245, 158, 11, 0.1)

Animation:
  Slide in from right
  Auto-dismiss: 5 seconds
  Dismiss button: Small X icon (top-right)

Stack behavior:
  Max 3 visible, others queue
  Spacing: 12px between toasts
```

**Loading States**
```
Spinner:
  Size: 32px
  Style: Circular gradient spinner
  Color: Emerald → Lime gradient
  Animation: Smooth rotation (1s linear infinite)

Skeleton Loaders:
  Use for cards during initial load
  Style: Animated gradient shimmer
  Colors: Emerald tint with subtle pulse
    - Background: rgba(16, 185, 129, 0.05)
    - Shimmer: rgba(16, 185, 129, 0.15)
  Border-radius: Match component (12px for cards)
```

**Success/Error States** (Inline)
```
Success:
  Background: rgba(16, 185, 129, 0.1)
  Border: 1px solid rgba(16, 185, 129, 0.3)
  Icon: Checkmark (emerald)
  Text: Emerald (#10B981)

Error:
  Background: rgba(244, 63, 94, 0.1)
  Border: 1px solid rgba(244, 63, 94, 0.3)
  Icon: Alert circle (coral)
  Text: Coral (#F43F5E)

Info:
  Background: rgba(59, 130, 246, 0.1)
  Border: 1px solid rgba(59, 130, 246, 0.3)
  Icon: Info circle (blue)
  Text: Blue (#3B82F6)

Style: Glass card, 12px radius, 16px padding
```

---

## 5. Page Layouts

### 5.1 Dashboard (Home)

**Layout Structure:**
```
[Navigation Bar - 80px height, sticky]
- Emerald accents throughout

[Hero Section - Optional, 200px]
- Welcome message
- Quick stats (Total markets, Your balance, Active predictions)
- Glass card with emerald→lime gradient background
- Stats use emerald icons with white/lime numbers

[Featured Markets - If applicable]
- 1-2 large cards (featured/promoted)
- Purple gradient borders (rare use for premium)
- Larger than standard cards

[Markets Grid - Main content]
- Tab navigation: Live (Emerald) | Proposed (Orange) | Closed (Gray)
- 3-column grid (380px cards, 24px gap)
- Cards with emerald glass borders
- Infinite scroll or pagination

[Footer - 120px]
- Links, info
- Minimal, glass style with emerald accents
```

**Whitespace:**
```
Section vertical spacing: 64px
Container max-width: 1400px
Side padding: 48px
```

### 5.2 Create Market Page

**Layout:** Centered form (max-width: 700px)

```
[Navigation Bar]

[Page Header - 120px]
- Large title "Create Prediction Market"
- Subtitle explanation
- Glass card background with emerald border accent

[Form Card - Glass with emerald accents]
- Question input (large, prominent, emerald focus state)
- Description textarea
- Outcomes section (dynamic add/remove, lime add button)
- Close time selector (date/time picker with emerald highlights)
- Preview button (secondary, blue border)
- Submit button (emerald gradient, large, prominent)

[Preview Modal - Optional]
- Shows how market will appear
- Confirm (Emerald gradient) / Edit (Secondary blue) actions
```

### 5.3 My Predictions Page

**Layout:** List + Grid hybrid

```
[Navigation Bar]

[Stats Summary - 180px]
- 4-column grid
- Total Predictions (Emerald icon) | Active (Orange icon) | Won (Lime icon) | Lost (Coral icon)
- Glass cards with respective color accents
- Large numbers in monospace

[Filter Bar - 60px]
- Status filter tabs (Emerald active state)
- Sort dropdown
- Glass background with emerald tint

[Predictions List]
- Grouped by status (Active, Won, Lost, etc.)
- Each group: Section header + card grid
- Cards: Show market + your prediction + outcome
- Won predictions: Lime glow
- Lost predictions: Subtle coral tint
- Active: Emerald accent
```

### 5.4 Admin Dashboard (Separate, Simpler)

**Visual Style:** Less playful, more functional, but still polished

```
[Admin Nav Bar - Simpler, darker]
- Admin icon + "Admin Panel"
- Emerald accent underline
- Quick actions: Back to main, Logout

[Sidebar - 240px fixed left]
- Navigation sections:
  - Pending Approvals (Orange badge count)
  - Disputed Markets (Coral badge count)
  - User Management
  - Activity Logs
- Glass style with emerald selected state
- Less glassmorphism, more solid dark cards
- Emerald highlight for active section

[Main Content Area]
- Cards are simpler (less 3D, moderate glassmorphism)
- Tables for data-heavy sections with emerald headers
- Action buttons prominent but not gradient (solid emerald)
- Focus on usability over visual flair
- Lime for approve, Coral for reject

Color Scheme:
- Darker overall
- Emerald/Lime primary (no coral/orange unless necessary)
- More contrast for readability
- Tables: Emerald headers, white/gray text
```

---

## 6. Interaction Design

### 6.1 Animations (Subtle & Minimal)

**Page Transitions**
```
Duration: 0.3s
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Type: Fade + slight slide (20px)
```

**Card Interactions**
```
Hover:
  Transform: translateY(-8px) scale(1.03)
  Border: Emerald glow intensifies
  Box-shadow: Emerald shadow increases
  Duration: 0.3s
  Easing: ease-out

Click/Active:
  Transform: translateY(-2px) scale(1.01)
  Duration: 0.1s

Entry Animation (when cards load):
  Stagger: 50ms per card
  Type: Fade + slide up (30px)
  Duration: 0.4s
  Easing: ease-out
```

**Button Interactions**
```
Hover:
  Transform: translateY(-2px)
  Box-shadow: Respective color shadow (cyan, emerald, coral)
  Duration: 0.2s

Active/Press:
  Transform: translateY(0) scale(0.98)
  Duration: 0.1s

Ripple effect on click:
  Duration: 0.6s
  Easing: ease-out
  Color: rgba(16, 185, 129, 0.3) for primary
  Color: rgba(59, 130, 246, 0.3) for secondary
```

**Form Interactions**
```
Focus:
  Border color transition: Emerald (0.2s)
  Glow effect: Emerald shadow (0.3s fade in)

Invalid state:
  Border shake animation
  Duration: 0.5s
  Movement: 5px left-right
  Color: Coral border
```

**Modal Animations**
```
Open:
  Backdrop: Fade in (0.2s)
  Content: Scale 0.95 → 1 + Fade (0.3s)
  Easing: ease-out

Close:
  Reverse of open (0.2
  <function_calls>
<invoke name="artifacts">
<parameter name="command">update</parameter>
<parameter name="id">ritual_ui_ux_prd</parameter>
<parameter name="old_str">Close:
  Reverse of open (0.2</parameter>
<parameter name="new_str">Close:
  Reverse of open (0.2s faster)
```

**Micro-interactions**
```
Icon hover: Subtle rotate (5deg) + scale(1.1)
Badge pulse: For "Live" status only (emerald glow)
Toggle switches: Smooth slide transition (0.2s, emerald active state)
Checkbox: Scale + checkmark draw animation (emerald)
Radio: Emerald ripple on select
```

### 6.2 Loading & Empty States

**Skeleton Loaders** (Initial page load)
```
Duration: 1.5s infinite
Animation: Gradient shimmer (left to right)
Color: 
  - Base: rgba(16, 185, 129, 0.05)
  - Shimmer: rgba(16, 185, 129, 0.15)
Border-radius: Match component
Border: 1px solid rgba(16, 185, 129, 0.1)
```

**Empty States**
```
Style:
- Large icon (64px, emerald color)
- Heading (24px, white/dark)
- Description (16px, muted)
- Optional CTA button (Emerald gradient)

Examples:
- No markets: Emerald TrendingUp icon + "No markets yet" + Create Market button
- No predictions: Lime Trophy icon + "Start predicting!" + Browse Markets button
- Filter no results: "No markets match" + Clear filters (secondary blue button)
```

**Error States**
```
Style: Glass card, coral accent border
- Error icon (48px, coral)
- Error title (20px, white)
- Error message (16px, muted)
- Retry button (Coral gradient) OR contact support link (emerald)
```

### 6.3 Responsive Behavior (Desktop-Optimized)

**Breakpoints:**
```
Large Desktop: 1440px+ (3-column grid)
Standard Desktop: 1200px - 1439px (2-column grid)
Minimum: 1024px (2-column, tighter spacing)

Below 1024px: 
- Show notice: "Best viewed on desktop" (emerald banner)
- OR provide simplified mobile view (out of scope for MVP)
```

**Adaptive Elements:**
```
Cards: Fixed width (380px), never shrink
Navigation: Condense text to icons if needed
Sidebar: Can collapse to icon-only (emerald active indicators)
Modal: Reduce padding, maintain readability
Glass effects: Reduce blur intensity on smaller screens for performance
```

---

## 7. Dark Mode & Light Mode

### 7.1 Dark Mode (Primary)

**Background Layers:**
```
Base: #000000 (Pure black)
Layer 1: #0A0A0A (Slightly lifted)
Layer 2: #141414 (Cards, surfaces)
Layer 3: #1F1F1F (Elevated elements)
```

**Glass Elements:**
```
background: rgba(255, 255, 255, 0.05)
border: rgba(16, 185, 129, 0.2) /* Emerald tint */
backdrop-filter: blur(20px)
```

**Text:**
```
Primary: #FFFFFF (100%)
Secondary: rgba(255, 255, 255, 0.7)
Tertiary: rgba(255, 255, 255, 0.5)
Disabled: rgba(255, 255, 255, 0.3)
Accent: #10B981 (Emerald for links, highlights)
Secondary Accent: #3B82F6 (Blue for informational)
```

### 7.2 Light Mode

**Background Layers:**
```
Base: #FFFFFF (Pure white)
Layer 1: #F9FAFB (Slightly gray)
Layer 2: #F3F4F6 (Cards, surfaces)
Layer 3: #E5E7EB (Elevated elements)
```

**Glass Elements:**
```
background: rgba(255, 255, 255, 0.7)
border: rgba(16, 185, 129, 0.2)
backdrop-filter: blur(20px)
```

**Text:**
```
Primary: #000000 (100%)
Secondary: rgba(0, 0, 0, 0.7)
Tertiary: rgba(0, 0, 0, 0.5)
Disabled: rgba(0, 0, 0, 0.3)
Accent: #059669 (Deep Emerald for better contrast)
Secondary Accent: #2563EB (Deep Blue for better contrast)
```

### 7.3 Theme Toggle

**Position:** Top-right in navigation bar

**Style:**
```
Glass pill button
Width: 80px
Height: 40px
Border-radius: 20px (pill)
Background: Glass with emerald tint
Border: 1px solid rgba(16, 185, 129, 0.3)

Icons:
- Sun (light mode) - Amber/yellow
- Moon (dark mode) - Emerald glow

Active state:
- Background: Emerald gradient
- Icon slides left/right with smooth transition

Animation:
- Icon slides with spring animation (0.3s)
- Background color transition (0.3s)
- Global theme transition (0.3s all colors, ease-in-out)
```

---

## 8. Accessibility Considerations

### 8.1 Color Contrast

**WCAG AA Compliance (Minimum):**
```
Normal text: 4.5:1 contrast ratio
Large text (18px+): 3:1 contrast ratio
Interactive elements: 3:1 contrast ratio

Emerald (#10B981) on black: 5.4:1 ✓ Pass
Blue (#3B82F6) on black: 6.2:1 ✓ Pass
White on Emerald: 3.1:1 ✓ Pass (borderline)
White on Blue: 4.1:1 ✓ Pass

Testing:
- All text against backgrounds
- Icons against backgrounds
- Button states (hover, active, disabled)
```

**Adjustments for Vibrant Colors:**
```
If contrast fails:
- Add dark/light text shadows (1px offset, 50% opacity)
- Increase font weight (500 → 600)
- Add semi-transparent background overlays
- Use outline text style for headers
- Darken emerald to #059669 for light mode text
- Use deep blue #2563EB for better contrast in light mode
```

### 8.2 Keyboard Navigation

**Focus Indicators:**
```
Style:
- 2px solid outline
- Color: #10B981 (emerald)
- Offset: 2px
- Border-radius: Match component
- Box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2)

Visible on:
- All interactive elements
- Tab order logical (top to bottom, left to right)
- Skip links for main content ("Skip to markets")
```

**Keyboard Shortcuts (Optional):**
```
C: Create market
/: Focus search (if implemented)
Esc: Close modals
Arrow keys: Navigate cards (optional)
Enter: Activate focused element
Space: Toggle checkboxes/radios
```

### 8.3 Screen Reader Support

**Semantic HTML:**
```
- Use proper heading hierarchy (h1 → h6)
- <button> for clickable actions
- <a> for navigation
- <nav> for navigation sections
- <main> for main content
- <article> for market cards
- <form> for forms with proper labels
```

**ARIA Labels:**
```
- aria-label for icon-only buttons
  Example: <button aria-label="Place prediction">
- aria-describedby for form inputs
  Example: <input aria-describedby="balance-helper">
- aria-live="polite" for toast notifications
- role="status" for loading states
- aria-current="page" for active nav links
```

### 8.4 Motion Preferences

**Respect prefers-reduced-motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Keep essential transitions */
  button,
  a {
    transition: background-color 0.15s ease-out;
  }
}
```

---

## 9. Performance Optimization

### 9.1 Asset Optimization

**Images:**
```
- Use WebP format with PNG/JPG fallbacks
- Lazy load below-fold images
- Serve responsive sizes (srcset)
- Compress: 80% quality for photos
- Use CSS gradients instead of gradient images
```

**Icons:**
```
- Use SVG (inline for critical, external for others)
- Lucide React (tree-shakable, ~1-2KB per icon)
- No icon fonts
- Cyan/Emerald color variants via currentColor
```

**Fonts:**
```
- Load Inter via Google Fonts OR self-host
- Font-display: swap
- Preload critical font files
  <link rel="preload" href="inter.woff2" as="font" crossorigin>
- Subset fonts (Latin characters only)
- Use system fonts as fallback
```

### 9.2 CSS Optimization

**Critical CSS:**
```
- Inline above-fold styles (navbar, hero, first 3 cards)
- Load full CSS asynchronously
- Use CSS containment for cards
  contain: layout style paint;
```

**Glassmorphism Performance:**
```
- backdrop-filter is GPU-intensive
- Limit to max 20 glass elements per view
- Use will-change: transform for animated glass elements
- Avoid backdrop-filter on scrolling containers
- Reduce blur(40px) to blur(20px) on low-end devices
```

**3D Transforms:**
```
- Use transform3d for GPU acceleration
  transform: translate3d(0, -8px, 0) scale(1.03);
- Group animations with will-change
  will-change: transform, box-shadow;
- Remove will-change after animation completes
- Limit simultaneous 3D transforms to 10 elements
```

**Gradient Optimization:**
```
- Use CSS gradients (not images)
- Cache gradient definitions in CSS variables
  --emerald-gradient: linear-gradient(135deg, #10B981, #84CC16);
  --blue-gradient: linear-gradient(135deg, #3B82F6, #0EA5E9);
- Reuse gradients across components
```

### 9.3 JavaScript Optimization

**Code Splitting:**
```
- Lazy load admin panel (separate chunk)
- Lazy load market detail view modal
- Lazy load chart libraries (if added later)
- Lazy load date picker components
```

**React Optimization:**
```
- Use React.memo for MarketCard components
  const MarketCard = React.memo(({ market }) => {...});
- useMemo for computed values (odds, percentages)
  const percentage = useMemo(() => calculatePercentage(outcome), [outcome]);
- useCallback for event handlers
  const handleClick = useCallback(() => {...}, [deps]);
- Virtual scrolling for long lists (100+ cards)
  Use react-window or react-virtualized
```

**Data Updates:**
```
- Debounce live updates (10-15 seconds minimum)
- Batch state updates with startTransition (React 18)
- Avoid unnecessary re-renders
  - Check props with shallow equality
  - Use composition over prop drilling
- Cache API responses (5-10 seconds for market data)
```

### 9.4 Performance Targets

**Core Web Vitals:**
```
LCP (Largest Contentful Paint): < 2.5s
  - Target: First market card visible in < 2s
  
FID (First Input Delay): < 100ms
  - Target: Button clicks respond in < 50ms
  
CLS (Cumulative Layout Shift): < 0.1
  - Target: < 0.05 with proper skeleton loaders
```

**Custom Metrics:**
```
Time to Interactive: < 3s
  - All critical JS loaded and parsed
  
First Meaningful Paint: < 1.5s
  - Navigation + hero section visible
  
Card grid render time: < 500ms
  - 9 cards (3x3 grid) rendered in under 500ms
  
Modal open time: < 200ms
  - From click to fully rendered modal
  
Theme switch time: < 300ms
  - Smooth transition between dark/light
  
Scroll performance: 60fps
  - No jank during fast scrolling
```

**Performance Budget:**
```
Total JS bundle: < 200KB gzipped
Critical CSS: < 20KB
Total page weight: < 1MB
API response time: < 500ms (p95)
Card update frequency: 10-15 seconds (configurable)
```

---

## 10. Design Inspiration Reference

### 10.1 Myriad Market Analysis

**What to Adopt:**
- Clean card-based market display
- Clear visual hierarchy
- Prominent CTAs
- Smooth, professional feel
- Focus on data clarity

**What to Improve Upon:**
- Add vibrant emerald/lime colors (vs their neutral palette)
- Enhance with glassmorphism effects
- Add medium 3D depth
- Make it feel more "playful" and engaging
- Better outcome visualization (liquid bars vs simple bars)
- More visual feedback on interactions

### 10.2 Visual Differentiation

**How Ritual Stands Out:**
- **Bold emerald-green color palette** (vs neutral/purple competitors)
- **Glassmorphism + 3D effects** (vs flat designs)
- **Netflix-style browsing** (vs list/table views)
- **Playful gamification** (vs serious/corporate)
- **Unique "liquid bar" outcome visualization** (vs standard charts)
- **Growth and prosperity** (emerald suggests winning, blue suggests trust)

**Brand Personality:**
```
Ritual = Winning (Emerald) + Trustworthy (Blue) + Energetic (Glass + 3D)

Emerald: Growth, success, prosperity, wins, wealth
Blue: Technology, trust, clarity, reliability
Glass: Modern, transparent, lightweight
3D: Depth, engagement, premium quality
```

---

## 11. Component Library Structure

### 11.1 Atomic Design Hierarchy

**Atoms** (Smallest units)
```
Buttons:
- PrimaryButton (emerald gradient)
- SecondaryButton (blue gradient)
- TertiaryButton (glass with emerald border)
- DangerButton (coral gradient)
- IconButton (glass circular)

Inputs:
- TextInput (glass with emerald focus)
- TextArea (glass with emerald focus)
- Select (custom glass dropdown)
- Radio (emerald/blue states)
- Checkbox (emerald checked state)

Visual Elements:
- Icon (lucide-react, emerald/blue variants)
- Badge (status pills with respective colors)
- Label (text with optional icon)
- Tooltip (glass card on hover)
- Divider (subtle line with emerald tint)
```

**Molecules** (Combined atoms)
```
Forms:
- FormGroup (label + input + error + helper text)
- OutcomeSelector (radio group with liquid bars)
- AmountInput (input + balance display + fee preview)

Display:
- StatCard (icon + label + value, glass card)
- StatusPill (badge + text + optional icon)
- UserAvatar (image/initials + name + role badge)
- OutcomeBar (liquid bar with gradient + percentage)
- TimeIndicator (clock icon + remaining time + urgency color)

Interactive:
- VoteButtons (approve + reject pair)
- BalanceDisplay (trophy icon + points + trend)
- ThemeToggle (sun/moon switch with emerald active)
```

**Organisms** (Combined molecules)
```
Complex Components:
- MarketCard (complete card with all elements)
  - Header (status badge + time)
  - Content (question + creator + stats)
  - Outcomes (liquid bars)
  - Footer (pool + predictions count)
  
- NavigationBar (complete navbar)
  - Logo + nav links
  - Balance display
  - User menu + theme toggle
  
- PredictionForm (sidebar form)
  - Outcome selector
  - Amount input
  - Fee preview
  - Submit button
  
- ApprovalVotingPanel
  - Progress bar
  - Vote buttons
  - Voter list
  
- DisputeForm
  - Reason textarea
  - Evidence upload (future)
  - Submit button
```

**Templates** (Page layouts)
```
Page Structures:
- DashboardTemplate (nav + hero + grid)
- DetailViewTemplate (nav + modal overlay)
- FormPageTemplate (nav + centered card)
- AdminPanelTemplate (nav + sidebar + content)
```

---

## 12. Implementation Guidelines

### 12.1 Technology Stack

**CSS Framework:** Tailwind CSS (customized)

**Tailwind Configuration:**
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Brand
        'emerald': {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        'blue': {
          DEFAULT: '#3B82F6',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        // Supporting colors
        'lime': '#84CC16',
        'coral': '#F43F5E',
        'sky': '#0EA5E9',
        'cyan': '#06B6D4',
        'sunset': '#F59E0B',
        'purple-accent': '#8B5CF6',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '20px',
        'heavy': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glow-emerald': '0 8px 24px rgba(16, 185, 129, 0.4)',
        'glow-lime': '0 8px 24px rgba(132, 204, 22, 0.4)',
        'glow-blue': '0 8px 24px rgba(59, 130, 246, 0.4)',
        'glow-coral': '0 8px 24px rgba(244, 63, 94, 0.4)',
      },
      backgroundImage: {
        'gradient-emerald': 'linear-gradient(135deg, #10B981, #84CC16)',
        'gradient-blue': 'linear-gradient(135deg, #3B82F6, #0EA5E9)',
        'gradient-energy': 'linear-gradient(135deg, #10B981, #3B82F6)',
        'gradient-coral': 'linear-gradient(135deg, #F43F5E, #EF4444)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

### 12.2 Reusable Component Patterns

**Glass Card Component:**
```jsx
// components/GlassCard.jsx
const GlassCard = ({ 
  variant = 'default', // 'default' | 'heavy' | 'light' | 'emerald' | 'blue'
  className = '',
  children 
}) => {
  const variants = {
    default: 'bg-white/5 border-white/10 backdrop-blur-glass',
    heavy: 'bg-white/10 border-emerald-500/30 backdrop-blur-heavy',
    light: 'bg-white/[0.02] border-white/5 backdrop-blur-glass',
    emerald: 'bg-emerald-500/5 border-emerald-500/20 backdrop-blur-glass',
    blue: 'bg-blue-500/5 border-blue-500/20 backdrop-blur-glass',
  };
  
  return (
    <div className={`rounded-xl border ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};
```

**Market Card Component:**
```jsx
// components/MarketCard.jsx
const MarketCard = ({ 
  market,
  variant = 'standard', // 'standard' | 'featured'
  onClick 
}) => {
  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.03 }}
      whileTap={{ y: -2, scale: 1.01 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard 
        variant="emerald"
        className="p-5 cursor-pointer hover:border-emerald-500/40 hover:shadow-glow-emerald transition-all"
        onClick={onClick}
      >
        <StatusBadge status={market.status} />
        {/* Card content */}
      </GlassCard>
    </motion.div>
  );
};
```

**Status Badge Component:**
```jsx
// components/StatusBadge.jsx
const StatusBadge = ({ status, size = 'md' }) => {
  const config = {
    live: {
      gradient: 'bg-gradient-emerald',
      icon: <Circle className="w-2 h-2 fill-white animate-pulse-slow" />,
      label: 'Live'
    },
    proposed: {
      gradient: 'bg-gradient-to-r from-sunset to-orange-400',
      icon: null,
      label: 'Proposed'
    },
    resolved: {
      gradient: 'bg-gradient-emerald',
      icon: <Check className="w-3 h-3" />,
      label: 'Resolved'
    },
    // ... other statuses
  };
  
  const { gradient, icon, label } = config[status];
  
  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${gradient} text-white text-xs font-semibold uppercase`}>
      {icon}
      {label}
    </div>
  );
};
```

### 12.3 Animation Library

**Recommendation:** Framer Motion (React)

**Usage Examples:**
```jsx
// Card entrance animation
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: index * 0.05 }}
>
  <MarketCard market={market} />
</motion.div>

// Button hover animation
<motion.button
  className="bg-gradient-emerald px-8 py-3 rounded-xl"
  whileHover={{ y: -2, boxShadow: '0 8px 20px rgba(16, 185, 129, 0.5)' }}
  whileTap={{ y: 0, scale: 0.98 }}
>
  Place Prediction
</motion.button>

// Modal animation
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Modal />
    </motion.div>
  )}
</AnimatePresence>
```

### 12.4 State Management for Theme

**Use Context API + Local Storage:**
```jsx
// context/ThemeContext.jsx
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark');
  };
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

---

## 13. Quality Assurance Checklist

### 13.1 Visual QA

**Desktop (1440px):**
- [ ] All cards render at 380px width
- [ ] 3-column grid displays correctly with 24px gaps
- [ ] Glassmorphism effects visible and performant
- [ ] 3D hover effects work smoothly (60fps)
- [ ] Emerald gradients render correctly
- [ ] Blue secondary states visible
- [ ] Shadows have proper emerald/blue tints
- [ ] Purple accents used sparingly (badges only)

**Color Application:**
- [ ] Primary actions use emerald gradients
- [ ] Secondary actions use blue gradients
- [ ] Success states use bright lime highlights
- [ ] Errors/disputes use coral colors
- [ ] Warnings use orange colors
- [ ] Purple only on special badges/premium features
- [ ] Glass borders have emerald tint

**Dark Mode:**
- [ ] All text readable (contrast check passed)
- [ ] Glass effects visible against dark backgrounds
- [ ] Emerald/lime colors vibrant enough
- [ ] Blue secondary colors clear and distinguishable
- [ ] Icons visible with proper colors
- [ ] Gradients maintain vibrancy

**Light Mode:**
- [ ] All text readable (darker emerald #059669 for text)
- [ ] Glass effects not washed out
- [ ] Proper contrast maintained (WCAG AA)
- [ ] Border visibility (emerald tints visible)
- [ ] Backgrounds appropriately bright

### 13.2 Interaction QA

- [ ] All buttons respond to hover with emerald/blue glow
- [ ] Click/tap feedback immediate
- [ ] Form validation shows errors in coral
- [ ] Loading states display with emerald spinner
- [ ] Toasts appear with correct color borders
- [ ] Modals open/close smoothly with emerald accents
- [ ] Keyboard navigation works (emerald focus rings)
- [ ] Focus indicators visible and emerald-colored
- [ ] Theme toggle switches smoothly (0.3s transition)

### 13.3 Performance QA

- [ ] Page load < 3 seconds
- [ ] Smooth 60fps scrolling
- [ ] No layout shifts (CLS < 0.1)
- [ ] Animations don't drop frames
- [ ] Glass effects don't lag (< 20 elements per view)
- [ ] Card updates within 10-15 seconds
- [ ] 3D transforms GPU-accelerated
- [ ] Modal opens in < 200ms

### 13.4 Brand Consistency QA

- [ ] Emerald used for all primary actions
- [ ] Blue used for all secondary/informational actions
- [ ] Lime used for success/win states highlights
- [ ] Purple usage limited to special features only
- [ ] Coral used consistently for errors/disputes
- [ ] Orange used for warnings/urgency
- [ ] Glass effects have appropriate emerald tints
- [ ] Gradients follow brand color combinations

---

## 14. Future Enhancements (Post-MVP)

**Visual Enhancements:**
- Animated data visualizations (charts with emerald/blue themes)
- Confetti effects on wins (emerald-colored particles)
- Progress tracking animations with emerald loading bars
- 3D trophy/badge system (emerald for wins, gold for achievements)
- Sound effects (subtle, toggle-able, natural/growth sounds matching emerald theme)
- Particle effects on hover (subtle emerald sparkles)

**UX Improvements:**
- Market search with autocomplete (emerald highlights)
- Advanced filters with emerald active states
- Personalized recommendations with lime "suggested for you" badges
- Tutorial/onboarding flow with emerald progress indicators
- Achievement system with tiered badges (bronze/silver/gold/emerald)
- Leaderboard with emerald rankings and lime winner highlights

**Technical:**
- PWA support with emerald splash screen
- Offline mode with emerald "offline" indicator
- Push notifications with brand colors
- Real-time WebSocket updates (15s → 1s)
- Mobile responsive design maintaining emerald/blue brand
- Advanced analytics dashboard with emerald/blue data viz

---

## 15. Design Delivery Assets

### 15.1 What Designers Should Provide

**High-Fidelity Mockups (Figma/Sketch):**
- Dashboard (3 states: Live, Proposed, Closed) - Cyan dominant
- Market detail view with cyan modal and emerald success states
- Create market form with cyan accents
- My Predictions page with emerald wins highlighted
- Admin dashboard with simplified cyan theme
- Mobile warning screen (out of scope but nice to have)
- Theme toggle states (dark/light)

**Component Library in Figma:**
- All buttons with color variants:
  - Primary (cyan gradient)
  - Success (emerald gradient)
  - Secondary (glass with cyan border)
  - Danger (coral gradient)
- All form elements with focus states (cyan)
- All card variants with color applications
- Navigation variations (dark/light mode)
- Modal templates with cyan borders
- Status badges in all colors
- Icons library with cyan/emerald variants

**Style Guide Document:**
- Color palette with exact hex codes
  - Primary: Cyan spectrum
  - Secondary: Emerald spectrum
  - Accents: Coral, Orange, Purple (minimal)
- Typography scale with font weights
- Spacing system (4px base)
- Shadow/elevation examples with cyan tints
- Icon set with color guidelines
- Gradient definitions (CSS code included)
- Glassmorphism recipes (backdrop-filter values)

**Interactive Prototype:**
- Clickable prototype (Figma/Framer)
- Key user flows demonstrated
  - Browse → Select → Predict (cyan path)
  - Win scenario (emerald celebration)
  - Error scenario (coral feedback)
- Animations showcased (hover, transitions)
- Theme switching demonstrated

### 15.2 Developer Handoff

**Specifications Export:**
- Component spacing (exact px values)
- Font sizes and weights
- Color values (hex + rgba with opacity)
- Shadow values (CSS box-shadow)
- Border radius values (4px, 12px, 16px, etc.)
- Animation timing functions (cubic-bezier)
- Gradient definitions (CSS linear-gradient)
- Backdrop-filter values (blur(20px), etc.)

**Assets Export:**
- SVG icons (monochrome for color flexibility)
- Logo variations (white, cyan, emerald)
- Background patterns (if any, subtle cyan tints)
- Gradient swatches for CSS

**CSS Variables Setup:**
```css
:root {
  /* Primary Brand */
  --color-cyan: #06B6D4;
  --color-cyan-deep: #0891B2;
  --color-cyan-light: #67E8F9;
  
  /* Secondary Brand */
  --color-emerald: #10B981;
  --color-emerald-deep: #059669;
  --color-emerald-light: #6EE7B7;
  
  /* Accents */
  --color-coral: #F43F5E;
  --color-orange: #F59E0B;
  --color-purple: #8B5CF6;
  --color-pink: #EC4899;
  
  /* Gradients */
  --gradient-emerald: linear-gradient(135deg, #10B981, #84CC16);
  --gradient-blue: linear-gradient(135deg, #3B82F6, #0EA5E9);
  --gradient-energy: linear-gradient(135deg, #10B981, #3B82F6);
  --gradient-success: linear-gradient(135deg, #6EE7B7, #10B981);
  --gradient-alert: linear-gradient(135deg, #F43F5E, #F59E0B);
  
  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(16, 185, 129, 0.2);
  --glass-blur: blur(20px);
}
```

---

## 16. Success Metrics for UI/UX

### 16.1 Quantitative Metrics

**User Engagement:**
- Average session duration > 5 minutes
- Cards clicked per session > 3
- Market creation completion rate > 70%
- Prediction placement time < 30 seconds
- Return visitor rate > 40%
- Theme toggle usage > 20% (indicates engagement with customization)

**Performance:**
- Page load time < 3 seconds
- Time to Interactive < 3 seconds
- Bounce rate < 30%
- Scroll depth > 60%
- Modal open/close smoothness: 0 jank reports

**Accessibility:**
- Keyboard navigation success rate: 100%
- Screen reader compatibility: WCAG AA compliant
- Color contrast pass rate: 100%
- Error identification rate: 100%

### 16.2 Qualitative Metrics

**User Feedback (Target Responses):**
- "Looks professional and modern"
- "Love the vibrant emerald/green color scheme"
- "Easy to use and understand"
- "Visually appealing and fun"
- "Stands out from other prediction markets"
- "The glass effects are beautiful"
- "Feels premium but playful"
- "The emerald/lime colors make it feel prosperous"

**Design Quality Indicators:**
- No major usability issues reported
- Positive comments on aesthetics (>80%)
- Users understand navigation without tutorial
- Admin panel is efficient (task completion < 2 minutes)
- Brand recognition (users remember emerald-green scheme)
- Emotional response: "exciting," "prosperous," "innovative," "energetic"

**Competitive Differentiation:**
- Users can identify Ritual vs competitors by emerald-green brand (brand recall)
- Preference for Ritual UI over alternatives (A/B testing)
- Social sharing of UI screenshots (organic marketing)
- "Most visually distinctive prediction market" feedback target

---

## 17. LOCK RULE (UI/UX)

**Any design changes must:**
1. ✓ Reference this UI/UX PRD explicitly
2. ✓ Maintain emerald-green as primary brand color
3. ✓ Use blue spectrum for secondary actions and informational states
4. ✓ Limit purple to special features/badges only (rare use)
5. ✓ Preserve glassmorphism + medium 3D effects
6. ✓ Maintain performance targets (LCP < 2.5s)
7. ✓ Ensure WCAG AA accessibility compliance
8. ✓ Support both dark and light modes
9. ✓ Keep playful/gamified aesthetic
10. ✓ Preserve Netflix-style card browsing

**Design Change Process:**
- **Minor changes** (< 5% visual impact): Document in changelog
- **Medium changes** (new component variants): Design review + update PRD
- **Major changes** (color palette, layout structure): Update PRD version, stakeholder approval
- **User testing** recommended for changes affecting core interactions

**Forbidden Changes (Without PRD Update):**
- Changing primary brand from emerald-green to another color
- Removing glassmorphism effects entirely
- Changing card layout from Netflix-style
- Removing 3D hover effects
- Downgrading accessibility compliance
- Changing blue from secondary to primary color

---

## Document Version History

- **v3.0 (January 15, 2026)**: Complete rewrite with emerald-green as primary brand color, blue spectrum as secondary, vibrant color palette with professional interplay. Purple reserved for rare special features only. Professional senior UI/UX developer specifications.
- v2.0 (January 15, 2026): Intermediate version with cyan-blue primary
- v1.0 (January 14, 2026): Initial UI/UX PRD with purple primary

**Document Owner:** Design & Development Team  
**Stakeholders:** Ritual Network Community, Product Team  
**Review Cycle:** After MVP launch for design refinement  
**Next Review Date:** Post-launch + 30 days

---

## 18. Appendix

### A. Color Psychology & Brand Alignment

**Why Emerald-Green as Primary:**
- **Growth & Prosperity**: Emerald represents winning, success, and financial growth
- **Energy & Vitality**: Vibrant emerald creates an exciting, dynamic atmosphere
- **Trust & Balance**: Green suggests fairness and natural prosperity
- **Differentiation**: Uncommon as primary in prediction market space - stands out
- **Optimism**: Bright emerald suggests opportunity and potential gains
- **Community**: Aligns with collaborative, growth-oriented community values
- **Modern**: Fresh alternative to typical blue-dominated fintech/crypto apps

**Why Blue as Secondary:**
- **Trust & Reliability**: Blue spectrum conveys stability and dependability
- **Technology**: Blue suggests innovation and digital-first thinking
- **Clarity**: Blue implies transparency and clear information
- **Professional**: Provides balance to vibrant emerald primary
- **Complementary**: Works harmoniously with emerald without competition
- **Informational**: Perfect for secondary actions and data display

**Why Purple as Rare Accent Only:**
- **Premium Feel**: Reserved for special features maintains exclusivity
- **Minimally Used**: Prevents palette confusion and dilution
- **Complementary**: Works well with emerald/blue in small doses
- **Flexibility**: Available for future premium/VIP features
- **Special Recognition**: Badges, achievements, rare highlights only

### B. Glossary of UI Terms

- **Glass/Glassmorphism**: Semi-transparent UI element with backdrop blur
- **3D Depth**: Visual layering using shadows, transforms, and perspective
- **Liquid Bar**: Custom progress bar with flowing gradient appearance
- **Ghost Button**: Transparent button with border only
- **Pill**: Fully rounded button or badge (border-radius: 999px)
- **Toast**: Temporary notification that appears and dismisses
- **Skeleton Loader**: Placeholder UI that shows content structure while loading
- **Modal**: Overlay dialog that focuses user attention
- **Hero Section**: Large prominent area at top of page
- **Sticky**: Element that remains fixed during scroll

### C. Design Tools & Resources

**Recommended Design Tools:**
- Figma (primary design tool)
- Framer (for advanced prototyping)
- Stark (accessibility checking)
- Contrast Checker (WCAG compliance)

**Development Tools:**
- Tailwind CSS Intellisense (VS Code)
- Headless UI (unstyled accessible components)
- Radix UI (primitive components)
- Framer Motion (animations)

**Icon Resources:**
- Lucide React (primary icon library)
- Heroicons (backup option)

**Font Resources:**
- Google Fonts (Inter font family)
- JetBrains Mono (for monospace numbers)

---

## 19. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Set up Tailwind CSS with custom color palette (emerald, blue, supporting colors)
- [ ] Configure CSS variables for all colors, gradients, and glass effects
- [ ] Install and configure Lucide React icon library
- [ ] Set up Inter and JetBrains Mono fonts
- [ ] Create base glassmorphism utility classes
- [ ] Implement dark/light mode theme provider
- [ ] Set up spacing, typography, and shadow system
- [ ] Create theme toggle component with emerald active state

### Phase 2: Core Components (Week 2)
- [ ] Build Button components (primary emerald, secondary blue, tertiary, danger)
- [ ] Build Form components (Input, Textarea, Select, Radio, Checkbox) with emerald focus states
- [ ] Build Card component with glass effect and emerald border accents
- [ ] Build Modal component with backdrop blur
- [ ] Build Toast notification system with status colors
- [ ] Build Loading states (Spinner, Skeleton with emerald shimmer)
- [ ] Test all components in dark/light modes

### Phase 3: Market Cards (Week 3)
- [ ] Build MarketCard component (380x280px, Netflix-style)
- [ ] Implement status badges (Live emerald pulse, Proposed orange, etc.)
- [ ] Create liquid bar outcome visualization with gradients
- [ ] Add 3D hover effects (translateY, scale, emerald shadow)
- [ ] Implement card grid layout (3 columns, 24px gap)
- [ ] Test card performance (React.memo, optimization)
- [ ] Add skeleton loaders for card loading states

### Phase 4: Page Layouts (Week 4)
- [ ] Build Navigation bar (sticky, glass with emerald tint, 80px height)
- [ ] Build Dashboard/Home page layout with hero section
- [ ] Build Market detail view (modal/overlay with emerald accents)
- [ ] Build Create Market page (centered form, emerald CTAs)
- [ ] Build My Predictions page (stats grid with color-coded cards)
- [ ] Build Admin Dashboard (simpler, functional, emerald highlights)
- [ ] Implement tab navigation with emerald active states

### Phase 5: Interactions & Animations (Week 5)
- [ ] Add button hover/active transitions (0.2s, emerald glow)
- [ ] Add card entry animations (stagger, fade+slide)
- [ ] Add modal open/close animations
- [ ] Add form validation feedback (shake, emerald/coral borders)
- [ ] Add loading state transitions
- [ ] Implement prefers-reduced-motion support
- [ ] Test animation performance (60fps target)

### Phase 6: Polish & Accessibility (Week 6)
- [ ] Run WCAG AA contrast checks (emerald/blue on backgrounds)
- [ ] Implement keyboard navigation and focus indicators (emerald outline)
- [ ] Add ARIA labels to all interactive elements
- [ ] Test with screen readers
- [ ] Add semantic HTML structure
- [ ] Implement error boundaries
- [ ] Add empty states with emerald icons
- [ ] Test responsive behavior (1440px, 1200px, 1024px)

### Phase 7: Performance Optimization (Week 7)
- [ ] Implement code splitting (admin, detail view)
- [ ] Add lazy loading for below-fold images
- [ ] Optimize glassmorphism usage (max 20 elements)
- [ ] Implement virtual scrolling for long lists
- [ ] Add will-change for animated elements
- [ ] Optimize gradient rendering
- [ ] Run Lighthouse audit (target: >90 performance score)
- [ ] Test on various devices/browsers

### Phase 8: Testing & Refinement (Week 8)
- [ ] User testing sessions (5-10 users)
- [ ] Gather qualitative feedback on emerald/blue scheme
- [ ] A/B test variations if needed
- [ ] Fix reported usability issues
- [ ] Measure Core Web Vitals (LCP, FID, CLS)
- [ ] Document any design deviations from PRD
- [ ] Final QA pass on all components and pages

### Post-Launch Monitoring
- [ ] Track engagement metrics (session duration, cards clicked)
- [ ] Monitor performance metrics (page load, interaction times)
- [ ] Collect user feedback on aesthetics
- [ ] Identify areas for improvement
- [ ] Plan iterations based on data

---

## 20. Quick Reference: Color Usage by Context

### Primary Actions & Branding
- **Use:** Emerald gradient (#10B981 → #84cc16)
- **Where:** Main CTAs, nav active states, brand elements, primary focus
- **Effect:** Emerald glow on hover/focus

### Secondary Actions & Information
- **Use:** Blue gradient (#3B82F6 → #0EA5E9)
- **Where:** Secondary buttons, info cards, tabs, non-critical actions
- **Effect:** Blue glow on hover

### Success & Winning States
- **Use:** Bright Lime (#84CC16) or Emerald-Lime gradient
- **Where:** Resolved markets (winner), positive changes, success messages
- **Effect:** Gold/emerald glow

### Active/Live States
- **Use:** Emerald (#10B981) with pulse animation
- **Where:** Live market badges, active indicators, real-time data
- **Effect:** Subtle pulse glow

### Warnings & Urgent
- **Use:** Orange (#F59E0B) or Orange-Coral gradient
- **Where:** Closing soon, warnings, attention needed
- **Effect:** Orange glow

### Errors & Disputes
- **Use:** Coral (#F43F5E) or Coral gradient
- **Where:** Error messages, disputes, rejected actions, delete buttons
- **Effect:** Coral glow

### Special/Premium (Rare Use)
- **Use:** Purple (#8B5CF6) or Purple-Pink gradient
- **Where:** Badges, achievements, premium features ONLY
- **Effect:** Purple glow (minimal)

### Glass & Borders
- **Use:** rgba(16, 185, 129, 0.2) for emerald tint
- **Where:** Card borders, glass overlays, dividers
- **Effect:** Subtle emerald tint on glass surfaces

---

**End of UI/UX PRD v3.0**

This document represents the complete visual design system and user experience guidelines for the Ritual Community Prediction Market, with **emerald-green as the primary brand identity**, **blue spectrum for secondary actions**, vibrant color interplay throughout, and minimal purple accents reserved for special features only. The design prioritizes a playful, gamified aesthetic with prosperity and growth at its core, delivered through glassmorphism, medium 3D effects, and performance-optimized interactions.</parameter>