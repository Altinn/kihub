---
name: react-best-practices
description: 'Expert guidance on React modern best practices, including hooks, performance optimization, and clean component architecture.'
---

# ⚛️ React Best Practices

Master the art of building scalable, performant, and maintainable React applications. This skill transforms the agent into a Senior React Architect capable of auditing codebases, refactoring legacy components, and implementing state-of-the-art patterns.

## When to Use This Skill

Use this skill when you need to:
- **Refactor Legacy Code**: Migrate class-based components to functional components with Hooks.
- **Optimize Performance**: Identify and fix unnecessary re-renders using `memo`, `useMemo`, and `useCallback`.
- **Architect State**: Decide between local state, context, or external state management (Zustand, Redux, etc.).
- **Enhance Accessibility**: Ensure JSX follows ARIA patterns and WCAG guidelines.
- **Standardize Style**: Implement consistent prop patterns, naming conventions, and folder structures.

## Core Capabilities

### 1. 🪝 Hooks Mastery
Deep understanding of the React lifecycle in the functional world. Avoiding stale closures, managing complex effects, and building robust custom hooks for reusability.

### 2. ⚡ Performance Auditing
Techniques to minimize the virtual DOM diffing overhead. Profiling components and applying memoization where it actually matters (avoiding premature optimization).

### 3. 🏗️ Component Architecture
Implementing patterns like **Composition over Inheritance**, **Atomic Design**, and **Container/Presenter** (when applicable). Focus on separation of concerns between UI and business logic.

## Usage Examples

### Example 1: Refactoring to Custom Hooks
**Input:** A component with multiple `useEffect` and `useState` for window resizing.
**Skill Action:** Extracts the logic into a reusable `useWindowSize` hook, keeping the UI component clean.

### Example 2: Performance Fix
**Input:** A list component that re-renders every item on every keystroke.
**Skill Action:** Implements `React.memo` for list items and `useCallback` for event handlers to stabilize references.

## Guidelines

1. **Functional First** - Always prefer functional components and hooks over class components.
2. **Predictable Props** - Use descriptive prop names and prefer destructuring for clarity.
3. **Semantic JSX** - JSX should reflect the document structure using semantic HTML elements (nav, main, section) and fragments.
4. **State Locality** - Keep state as close as possible to where it is used to avoid "prop drilling" and over-broad re-renders.
5. **Types and Contracts** - Always recommend TypeScript or PropTypes to define clear component interfaces.

## Common Patterns

### Pattern: Composition
```jsx
// Instead of complex prop flags, use children composition
<Card>
  <Card.Header title="Modern React" />
  <Card.Body>
    <p>Always favor composition for flexible UIs.</p>
  </Card.Body>
</Card>
```

### Pattern: Custom Hook
```javascript
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : initialValue;
  });
  
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
```

## Limitations

- Does not strictly enforce a specific styling library (Tailwind vs CSS Modules) unless requested.
- Focused on React Core; specific deep-dives into external frameworks (like Next.js or Remix) should be cross-referenced with their respective skills if available.
- Cannot physically run tests; provides patterns optimized for testability (e.g., using Testing Library).
