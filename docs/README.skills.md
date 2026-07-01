# 🎯 Agent Skills

Agent Skills are self-contained folders with instructions and bundled resources that enhance AI capabilities for specialized tasks. Based on the [Agent Skills specification](https://agentskills.io/specification), each skill contains a `SKILL.md` file with detailed instructions that agents load on-demand.

Skills differ from other primitives by supporting bundled assets (scripts, code samples, reference data) that agents can utilize when performing specialized tasks.
### How to Contribute

See [CONTRIBUTING.md](../CONTRIBUTING.md#adding-skills) for guidelines on how to contribute new agent skills, improve existing ones, and share your use cases.

### How to Use Agent Skills

**What's Included:**
- Each skill is a folder containing a `SKILL.md` instruction file
- Skills may include helper scripts, code templates, or reference data
- Skills follow the Agent Skills specification for maximum compatibility

**When to Use:**
- Skills are ideal for complex, repeatable workflows that benefit from bundled resources
- Use skills when you need code templates, helper utilities, or reference data alongside instructions
- Skills provide progressive disclosure - loaded only when needed for specific tasks

**Usage:**
- Browse the skills table below to find relevant capabilities
- Copy the skill folder to your local skills directory
- Reference skills in your prompts or let the agent discover them automatically

| Name | Description | Bundled Assets |
| ---- | ----------- | -------------- |
| [add-educational-comments](../skills/add-educational-comments/SKILL.md) | Add educational comments to the file specified, or prompt asking for file to comment if one is not provided. | None |
| [organisational-dysfunction](../skills/organisational-dysfunction/SKILL.md) | Diagnose organisational and team dysfunction as a problem of structure rather than people, using open sociotechnical systems theory. Use whenever someone is grappling with org design, team autonomy, ways of working and everyday rituals (standups, retros, reviews), incentives, leadership, or a stalled agile/change transformation — especially when symptoms are being blamed on individuals, mindset, or "communication". | `README.md`<br />`references/01-the-daily-status-report.md`<br />`references/02-passing-the-buck.md`<br />`references/03-the-powerless-retrospective.md`<br />`references/04-passivity-in-team-workshops.md`<br />`references/05-forming-storming-norming-performing.md`<br />`references/06-analysis-paralysis.md`<br />`references/07-individualism.md`<br />`references/08-quiet-quitting.md`<br />`references/09-team-leads.md`<br />`references/10-the-companys-strategy-is-unclear.md`<br />`references/11-workshops-not-working.md`<br />`references/12-communication-problems.md`<br />`references/13-hippos-and-dungeon-masters.md`<br />`references/14-local-optimisations.md`<br />`references/15-the-frozen-middle.md`<br />`references/16-fear-of-making-decisions.md`<br />`references/17-psychological-safety-as-a-patch.md`<br />`references/18-okrs-imposed-from-above.md`<br />`references/19-the-agile-terrarium.md`<br />`references/20-built-for-yesterday.md`<br />`references/21-deploying-ai-into-a-broken-system.md`<br />`references/22-fixing-people.md`<br />`references/23-the-error-factory.md`<br />`references/24-dora-the-wrong-way-round.md`<br />`references/25-burned-by-design.md`<br />`references/26-professional-leadership.md`<br />`references/27-tyranny-of-the-majority.md`<br />`references/28-involvement-theatre.md`<br />`references/29-team-topologies-the-wrong-way-round.md`<br />`references/30-the-external-verdict.md`<br />`references/31-working-alone-together.md`<br />`references/32-the-collaboration-that-isnt.md`<br />`references/33-the-customer-we-never-met.md`<br />`references/34-the-sunday-email.md`<br />`references/35-people-resist-change.md`<br />`references/36-empowerment.md`<br />`references/37-outsourcing-the-future.md`<br />`references/38-the-product-owner-trap.md`<br />`references/39-doing-the-wrong-thing-right.md`<br />`references/40-the-project-in-product-clothing.md`<br />`references/41-the-performance-review.md`<br />`references/42-the-pilot-trap.md`<br />`references/43-the-ai-we-cannot-talk-about.md`<br />`references/44-change-agents-of-the-status-quo.md`<br />`references/45-fixing-the-process.md`<br />`references/46-them-and-us.md`<br />`references/47-out-of-sight-out-of-sync.md`<br />`references/48-its-just-a-job.md`<br />`references/49-the-pair-that-runs-everything.md`<br />`references/50-the-agile-scaling-trap.md`<br />`references/51-budgets-are-bureaucracy.md`<br />`references/52-career-paths.md`<br />`references/53-designed-to-undermine.md`<br />`references/54-pay-and-reward.md`<br />`references/55-the-learning-organisation-that-doesnt-learn.md`<br />`references/56-permanent-urgency.md`<br />`references/57-the-market-we-think-we-shape.md`<br />`references/58-the-short-termism-machine.md`<br />`references/59-the-corridor-conversation.md` |
| [tekstforfatter](../skills/tekstforfatter/SKILL.md) | Norsk tekstforfatter og redaktør: klarspråk, AI-markører, anglisismer, fagtermer, mikrotekst. | None |
