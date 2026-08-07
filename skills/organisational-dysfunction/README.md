# Organisational Dysfunction

Diagnose recurring organisational and team dysfunctions through **open sociotechnical systems theory** (the DP1 top-down vs DP2 self-managing distinction). The router `SKILL.md` carries the shared lens and indexes 59 named dysfunctions; each `references/NN-*.md` gives how it shows up, the sociotechnical diagnosis, and concrete remedies.

## Install / use

This skill lives in the [Altinn/kihub](https://github.com/Altinn/kihub) collection under `skills/organisational-dysfunction/`. As with the other kihub skills, copy the folder into your local skills directory and let the agent discover it:

```bash
git clone https://github.com/Altinn/kihub
cp -r kihub/skills/organisational-dysfunction ~/.claude/skills/
```

It then activates **automatically** whenever you describe an org/team dysfunction — you don't call it by name. (See the repo's [skills guide](../../docs/README.skills.md) for the general usage pattern.)

## Attribution

The 59 dysfunctions originate from **Trond Hjorteland**'s [*"Organisational Dysfunction of the Day"*](https://www.linkedin.com/pulse/organisational-dysfunction-day-full-list-trond-hjorteland-gxrze/) series. Content is **synthesised and paraphrased** (not copied) through the OST framing he uses, and each reference file links its specific source post.

## Changelog

New entries are appended as they are propagated from the upstream repo ([sorensensig/organisational-dysfunction](https://github.com/sorensensig/organisational-dysfunction)). Newest first.

### 0.6.0 — 2026-08-07
- Added `#66` **Everything is fine** (65 → 66 dysfunctions).

### 0.5.0 — 2026-08-05
- Added `#65` **The facilitator's toolkit** (64 → 65 dysfunctions).

### 0.4.0 — 2026-08-05
- Added `#63` **The leadership team that isn't** and `#64` **The code review that became personal** (62 → 64 dysfunctions).

### 0.3.0 — 2026-07-03
- Added `#62` **The agenda that sabotaged itself** (61 → 62 dysfunctions).

### 0.2.0 — 2026-07-02
- Added `#60` **The output nobody owned** and `#61` **Rearranging the furniture** (59 → 61 dysfunctions).

### 0.1.0 — 2026-07-02
- Initial contribution to kihub: 59 dysfunctions as one umbrella skill (router `SKILL.md` + `references/`).
