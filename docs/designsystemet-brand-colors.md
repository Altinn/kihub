# KI Hub Designsystemet Brand Colors

KI Hub brand colors are defined in the Designsystemet theme configuration at
`website/designsystemet.config.json`.

Approved token mapping:

| Brand role | Designsystemet token family | Source |
| --- | --- | --- |
| Primary action color | `accent` | `themes.kihub.colors.main.accent` |
| Primary red | `brand1` | `themes.kihub.colors.support.brand1` |
| Amber accent | `brand2` | `themes.kihub.colors.support.brand2` |
| Blue support accent | `brand3` | `themes.kihub.colors.support.brand3` |
| Neutral text and backgrounds | `neutral` | `themes.kihub.colors.neutral` |

Component and page code should reference Designsystemet CSS variables, such as
`--ds-color-brand1-base-default`, `--ds-color-brand2-surface-tinted`, and
`--ds-color-neutral-background-default`, rather than hardcoded color values.

Status colors use Designsystemet semantic tokens:

| Status role | Designsystemet token family |
| --- | --- |
| Success or available | `success` |
| Warning or coming soon | `warning` |
| Danger or error | `danger` |
| Informational | `info` |

No separate designer sign-off document exists for this update. This
repository-level mapping and the decision to use Designsystemet tokens for all
component-level colors were approved by the maintainer handling the story.
