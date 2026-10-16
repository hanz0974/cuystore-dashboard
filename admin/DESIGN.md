---
name: Cuystore Admin
description: Operational daylight dashboard for the local React demo.
colors:
  primary: "#176346"
  button-primary: "#196343"
  button-hover: "#104b31"
  ink: "#203b2e"
  body: "#26332e"
  metadata: "#647269"
  canvas: "#f7f9f8"
  surface: "#fff"
  line: "#e9edea"
  selected: "#eaf3ed"
  focus: "#66a88a"
  success: "#36865a"
  processing: "#446b9d"
  waiting: "#856522"
  cancelled: "#9a514c"
typography:
  headline: {fontFamily: "Manrope, sans-serif", fontSize: "26px", fontWeight: 750, lineHeight: 1.4, letterSpacing: "-1px"}
  metric: {fontFamily: "Manrope, sans-serif", fontSize: "27px", fontWeight: 750, letterSpacing: "-0.8px"}
  body: {fontFamily: "DM Sans, sans-serif", fontSize: "14px"}
  title: {fontFamily: "DM Sans, sans-serif", fontSize: "13px", fontWeight: 650, letterSpacing: "-0.1px"}
  label: {fontFamily: "DM Sans, sans-serif", fontSize: "11px", fontWeight: 550}
rounded:
  field: "7px"
  card: "13px"
  modal: "14px"
spacing:
  tight: "8px"
  field-gap: "16px"
  section: "23px"
  desktop-gutter: "38px"
components:
  button-primary: {backgroundColor: "{colors.button-primary}", textColor: "{colors.surface}", rounded: "{rounded.field}", padding: "10px 14px"}
  button-primary-hover: {backgroundColor: "{colors.button-hover}"}
  card: {backgroundColor: "{colors.surface}", rounded: "{rounded.card}"}
  navigation-selected: {backgroundColor: "{colors.selected}", rounded: "{rounded.field}", padding: "12px 13px"}
---

# Design System: Cuystore Admin

## Overview
The established direction is an operational daylight dashboard: white surfaces, quiet green accents, compact data, and a persistent side navigation. This document describes the local demo's implemented visual system; commerce integration remains unresolved.

## Colors
Primary forest green identifies actions, navigation, and chart emphasis. White panels sit on the pale canvas, separated by light neutral borders. Metadata uses the final darker metadata token, overriding earlier pale gray declarations. Status text uses distinct green, blue, amber, and red treatments with accompanying labels.

## Typography
Manrope carries the brand, page heading, and metric values; DM Sans carries controls and supporting text. Tables and metadata are intentionally dense, generally (9–11px). Metric and table numbers use tabular numerals. Page headings reduce to (24px) on mobile; metric sizes vary with available width.

## Layout
The desktop sidebar is (238px), with a matching content offset and a (76px) top bar. Main content has a maximum width of (1550px) and desktop horizontal gutters from the spacing scale. Four metrics share a bordered container; overview panels use a (1.85:1) grid.
At (1200px), navigation narrows to (210px) and gutters to (24px). At (1000px), overview panels stack and metrics become two columns. At (760px), navigation becomes a dismissible drawer, the content offset disappears, gutters become (20px), and tables retain horizontal scrolling. At (1500px) and above, charts and data rows gain room.

## Elevation & Depth
Most panels are flat: white fill and thin borders establish grouping. Shadows are reserved for primary buttons, notifications, dialogs, and toasts. Dialogs enter with a short vertical movement; the drawer slides horizontally. Reduced-motion preferences disable transitions and animations.

## Shapes
Cards use the card radius, controls the field radius, and dialogs the modal radius. Small status pills use (5px) corners; avatars and status dots are circular. Keep corners soft and borders subtle.

## Components
- Buttons: compact icon-and-label controls; green primary actions darken on hover, while white secondary actions gain a pale fill. Disabled buttons use half opacity.
- Navigation: text and outline icons, pale green selected fill, compact count badges, and a bottom account area. Mobile drawer closes against a dimmed backdrop.
- Cards and tables: restrained headings, fine dividers, tabular numeric columns, status badges with text and dots, and lightly highlighted row hover states.
- Inputs: white fields with subtle borders; keyboard focus uses a (3px) green outline offset by (3px). Search applies the same treatment to its enclosing field using focus-within.
- Dialogs and feedback: centered scrollable dialogs, compact form rows, notification popovers, and fixed bottom toast feedback.
- Menu editor: editable button list with up/down and visibility controls alongside a Telegram-style interactive preview; stack the preview below the editor at 950px. Preview buttons follow the selected 1–3 column layout and wrap long labels. Drafts persist across panel navigation; saving stores the menu locally, with explicit demo status.
- Bot connection: a settings panel with masked token input, optional admin chat ID, explicit Connect/Check/Disconnect actions, verified Telegram identity, and a separate message-test action. The status badge describes API verification; local commerce/demo status stays separate. Feedback uses written error/success text and icons. Token values never appear in connection summaries.
- Categories: a collapsible manager above the product table with an add form and editable category rows. Counts explain disabled deletion for categories in use. Category selection accepts custom text with a datalist; a compact dropdown filters the catalog. Keep existing green controls, readable metadata, and mobile stacking.

## Do's and Don'ts
- Do preserve compact hierarchy, tabular figures, visible keyboard focus, and readable darker metadata.
- Do keep responsive tables scrollable and reduce motion when requested.
- Don't use decorative shadows on every panel or remove written status labels.
- Don't imply that demo commerce data represents a connected production service.
