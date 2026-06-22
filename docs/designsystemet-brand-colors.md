# KI Hub Designsystemet Brand Colors

KI Hub brand colors are defined in the Designsystemet theme configuration at
`website/designsystemet.config.json`.

The current palette mirrors the KI Norge theme while keeping the local
Designsystemet theme name `kihub`, so generated imports stay stable.

Approved token mapping:

| Brand role | Designsystemet token family | Source |
| --- | --- | --- |
| KI Norge accent red | `accent` | `themes.kihub.colors.main.accent` |
| Purple support color | `brand1` | `themes.kihub.colors.support.brand1` |
| Brown support color | `brand2` | `themes.kihub.colors.support.brand2` |
| Peach support color | `brand3` | `themes.kihub.colors.support.brand3` |
| Coral support color | `brand4` | `themes.kihub.colors.support.brand4` |
| Neutral text and backgrounds | `neutral` | `themes.kihub.colors.neutral` |

Component and page code should reference Designsystemet CSS variables, such as
`--ds-color-base-default`, `--ds-color-surface-tinted`,
`--ds-color-brand2-surface-tinted`, and
`--ds-color-neutral-background-default`, rather than hardcoded color values.
Use `data-color="accent"`, `data-color="brand1"`, `data-color="brand2"`,
`data-color="brand3"`, or `data-color="brand4"` to scope generic tokens like
`--ds-color-background-default`, `--ds-color-text-default`, and
`--ds-color-base-default` to a specific color family.

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
