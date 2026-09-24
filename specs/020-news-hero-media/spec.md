# Feature Specification: News Hero Images with Editor-Controlled Framing

**Feature Branch**: `020-news-hero-media`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "News hero images: replace the free-text `heroImageUrl` field on the News collection with a managed image upload (relationship to the existing `media` upload collection), and enable Payload's built-in focal point and crop tools on `media`, so editors can control how a news image is framed. Problem: news cards on the frontpage and on /news show the hero image in a fixed 16:10 media well; images with a different aspect ratio (e.g. very wide images, or images containing text) get cropped awkwardly, cutting off the important part, and there is currently no way for an editor to adjust this because the image is just a pasted URL Payload never sees. Desired outcome: editors upload the hero image in /cms, optionally set a focal point (and optionally crop), and every card thumbnail (frontpage news section + /news grid) is served as a 16:10 derivative generated around that focal point (with a 2x variant for high-density screens), while the article detail page shows the full uncropped image. Existing news items that only have a `heroImageUrl` must keep rendering (legacy fallback) until an editor uploads a real image — no content lost, additive migration. Learning pages already use `media` and must keep working unchanged. Norwegian admin labels/help text consistent with the rest of the CMS."

## Context

News cards on the frontpage news section and on the "Nyheter" page (`/news`) show each article's
hero image in a fixed 16:10 frame. Today the hero image is a web address that the editor pastes in
as text. The portal never sees the actual file, so the only thing it can do is fill the frame and
cut off whatever doesn't fit. When an image is much wider or taller than 16:10, or has text in it,
the important part often gets cut off, and editors have no way to fix that.

The portal already has a managed image library ("Mediefiler"), which KI Læring pages use. This
feature lets news articles use that library for their hero image. It also gives editors two
framing tools: a **focal point** (the part of the image that must stay visible) and an optional
**crop**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editor uploads a news hero image and sets what must stay visible (Priority: P1)

An editor writing or editing a news article in the back office uploads the hero image directly
(or picks one already in the image library) instead of pasting a web address. The editor marks
the focal point, meaning the part of the picture that matters, such as a person's face or a line
of text. Every card that shows the article (frontpage news section and the `/news` grid) then
frames the image around that point.

**Why this priority**: This is the problem the user reported. On its own it fixes awkward cropping
for every new or updated article, and it's the smallest slice that delivers value.

**Independent Test**: In the back office, create an article and upload a very wide image with text
near one edge. Set the focal point on the text and publish. Confirm that the frontpage card and
the `/news` card both show the text inside the 16:10 frame.

**Acceptance Scenarios**:

1. **Given** an editor is editing a news article, **When** they open the hero image field,
   **Then** they can either upload a new image or choose an existing one from the image library,
   and alternative text is required for any new upload.
2. **Given** an uploaded hero image whose focal point the editor has moved from the centre to the
   right edge, **When** an employee views the article's card on the frontpage or on `/news`,
   **Then** the card shows a 16:10 view of the image that includes the marked focal point.
3. **Given** an uploaded hero image where the editor never set a focal point, **When** the card is
   shown, **Then** the image is framed around its centre, the same as today.
4. **Given** an employee on a high-density (retina) screen, **When** a card with an uploaded hero
   image is shown, **Then** the image is sharp, because a double-resolution version is served.

---

### User Story 2 - The article page shows the whole image (Priority: P1)

An employee opens a news article. The hero image at the top of the article is shown in full, in
its own aspect ratio, and is not cut to the card's 16:10 shape.

**Why this priority**: The card is the only place where the image has to fit a fixed shape. If
the article page cropped too, readers would never see the full picture, including any text it
contains. This is part of the requested outcome and small enough to ship together with Story 1.

**Independent Test**: Open the article from Story 1. Confirm the full-width image appears without
the 16:10 crop and with its alternative text.

**Acceptance Scenarios**:

1. **Given** an article with an uploaded hero image, **When** an employee opens the article page,
   **Then** the whole image is shown at the reading column's width, in its own aspect ratio, with
   the library item's alternative text.
2. **Given** an editor has cropped the uploaded image, **When** the article page is shown,
   **Then** the page shows the cropped result, because cropping deliberately changes the image
   itself.

---

### User Story 3 - Existing articles keep their images until an editor replaces them (Priority: P1)

Articles published before this feature have only a pasted web address as their hero image. They
must keep showing that image on cards and on the article page exactly as they do today. An editor
can switch any of them to an uploaded image whenever they like.

**Why this priority**: The request explicitly says no content may be lost. Without this, the
release would blank out images on every existing article.

**Independent Test**: Use a news article created before the change that has only a web-address
hero image. After the upgrade, confirm its card and article page still show the image. Then
upload a hero image for it and confirm the uploaded image replaces the old one everywhere.

**Acceptance Scenarios**:

1. **Given** an article with only a legacy web-address hero image, **When** it is shown on a card
   or its article page, **Then** the legacy image appears exactly as before the change.
2. **Given** an article that has both a legacy web address and an uploaded hero image, **When** it
   is shown anywhere, **Then** only the uploaded image is used.
3. **Given** an article with neither kind of hero image, **When** its card is shown, **Then** the
   existing "no image" placeholder frame appears, the same as today.
4. **Given** an editor opens an article that still uses a legacy web address, **When** they look
   at the hero image area in the back office, **Then** they can see the legacy address, and a
   Norwegian help text explains that uploading an image replaces it and enables framing control.

---

### User Story 4 - Editor crops an image before it is used (Priority: P3)

Sometimes an image has an unwanted border, a watermark strip, or too much empty space. The editor
wants to cut it away for good, not just choose what stays in view on cards.

**Why this priority**: Most framing problems are solved by the focal point alone (Story 1).
Cropping is a nice extra that comes with the back office's built-in image tools, so it is included, but
nothing else depends on it.

**Independent Test**: Upload an image, crop off one edge in the back office, and save. Confirm that
cards and the article page no longer show the cropped-off area.

**Acceptance Scenarios**:

1. **Given** an editor uploading or editing an image in the library, **When** they use the crop
   tool and save, **Then** every place that uses that image (news cards, the news article page,
   learning pages) shows the cropped version from then on.

---

### Edge Cases

- **Very small uploads** (narrower than the card's double-resolution width): the card version must
  never be scaled up beyond the original. The card still fills its 16:10 frame, and the image may
  look softer than a larger original would, but it must not be distorted or letterboxed.
- **Very tall or very wide images** (for example a 4:1 banner or a portrait photo): the focal point
  decides which 16:10 slice appears on the card. The article page shows the whole image.
- **Focal point changed after publishing**: the next time the card is shown, it must use the new
  framing. An old cached version must not stay in place indefinitely.
- **Image shared across articles or with learning pages**: a focal point or crop set on a library
  image applies everywhere that image is used. Help text in the back office must say so.
- **Library image deleted while an article still uses it**: the article must still render. It falls
  back to the legacy address if there is one, and otherwise to the placeholder. It must never error
  or show a broken image.
- **Existing learning-page images**: images uploaded before this change have no card-shaped version.
  If such an image is picked as a news hero, the card must still render correctly, either by
  producing the missing version or by falling back to filling the frame.
- **Unsupported file types and oversized files**: the rules already in place for the image library
  (PNG, JPEG, WebP and AVIF only, no SVG, 5 MB maximum, Norwegian error message) apply unchanged to
  news uploads.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The news article editing form MUST offer a hero image field that uploads an image to,
  or selects an image from, the existing image library ("Mediefiler"). Its label and help text MUST
  be in Norwegian.
- **FR-002**: Editors MUST be able to set a focal point on any image in the image library.
- **FR-003**: Editors MUST be able to crop any image in the image library, and the crop MUST apply
  to every use of that image.
- **FR-004**: For every image in the library, the system MUST produce a card-shaped (16:10) version
  framed around the image's focal point, or its centre when no focal point is set. It MUST also
  produce a double-resolution variant for high-density screens. Neither version may be scaled up
  beyond the original's resolution.
- **FR-005**: News cards on the frontpage news section and on the `/news` page MUST show an uploaded
  hero image using the card-shaped versions, and let the browser choose the sharper variant on
  high-density screens.
- **FR-006**: The news article page MUST show an uploaded hero image in full, in its own aspect
  ratio, at the reading column's width, and never cut to the card's 16:10 shape.
- **FR-007**: Every uploaded hero image MUST be shown with the alternative text stored on its image
  library item.
- **FR-008**: The existing web-address hero field MUST be kept and MUST still work as a fallback.
  When an article has an uploaded hero image, the uploaded image MUST take precedence everywhere.
  When it has only a web address, the web address MUST be used exactly as today. When it has
  neither, the existing placeholder MUST be shown.
- **FR-009**: The upgrade MUST NOT delete, rewrite or empty any existing article's web-address hero
  value. The data change MUST add things only and MUST be reversible.
- **FR-010**: If an article's hero image points to a library item that no longer exists, the
  article MUST render using the FR-008 fallback order instead of failing.
- **FR-011**: Learning pages MUST keep displaying their images exactly as before. Their existing
  image sizes and appearance MUST NOT change.
- **FR-012**: The existing upload rules for the image library MUST apply unchanged to news hero
  uploads: allowed file types, the ban on SVG, the 5 MB limit with a Norwegian error message, and
  editor-only write access.
- **FR-013**: Now that news and learning pages share the image library, its back-office grouping and
  help text MUST NOT suggest it belongs only to KI Læring. Help text on the focal point and crop
  MUST explain that changes apply everywhere the image is used.
- **FR-014**: Hero images on employee-facing pages MUST continue to follow the portal's design system
  and existing card and article styling. The only visual change is which part of the image appears
  inside the existing frames.

### Key Entities

- **News article**: Gains a reference to an optional **hero image** in the image library. It keeps
  its optional **legacy hero image address** as a fallback.
- **Image library item** ("Mediefil"): An uploaded image with required alternative text. It gains an
  optional **focal point**, an optional **crop**, and **card-shaped versions** (standard and double
  resolution) next to its existing reading-width versions. News articles and learning pages share
  it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a test image where the important element sits at the very edge (for example text
  in the outer 15% of a 3:1 image), once the focal point is set on it, that element is fully
  visible on both the frontpage card and the `/news` card.
- **SC-002**: An editor can upload a hero image, set its focal point and publish the article in
  under 2 minutes, without leaving the article's editing form.
- **SC-003**: After the upgrade, 100% of existing articles that had a hero image still show it on
  cards and article pages, and no stored web-address value has changed.
- **SC-004**: 100% of existing learning-page images render unchanged, with the same size and
  appearance as before the upgrade.
- **SC-005**: On high-density screens, card images with an uploaded hero are served at double
  resolution when the original is large enough, so they look no blurrier than other images on the
  portal.
- **SC-006**: No news card or article page shows a broken image, whether the hero is uploaded,
  legacy, missing, or points to a deleted library item.

## Assumptions

- **Reuse, don't duplicate**: the image library ("Mediefiler") from KI Læring is reused as is. Its
  storage (local disk in development, private cloud storage in production), access rules, and
  upload limits already cover news images. No second upload mechanism is introduced.
- **Legacy field stays for now**: the old web-address field stays editable in the back office but
  is de-emphasised and labelled as legacy/fallback. It is not migrated automatically. Downloading
  arbitrary external addresses into the library would bring in files nobody checked, and would
  have no alternative text. Retiring the field entirely is a possible later clean-up once editors
  have replaced the legacy images.
- **Focal point is the main tool, crop is secondary**: the focal point changes only how derived
  versions are framed and keeps the original. Crop changes the stored image itself, which is how
  the built-in tool works. Both are optional.
- **Card shape stays 16:10**: the existing card frame stays exactly as it is. Only the image inside
  it changes.
- **Projects are out of scope**: project cards have no hero image today and gain none here.
- **Existing library images**: images uploaded before this change get card-shaped versions when
  they are next saved, or they fall back gracefully (see Edge Cases). A bulk re-processing of old
  learning images is not required, because none of them are used as news heroes yet.
- **Constitution**: this extends existing native content (News) with the existing Payload-owned
  media capability (Principle II). It does not add a new Product Module and should not need a
  constitution amendment.
