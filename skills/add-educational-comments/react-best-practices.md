# React Best Practices for Educational Comments

When adding educational comments to React components, focus on these modern patterns and "whys".

## 1. Functional Components & Hooks
Explain why we use Hooks instead of Lifecycle methods.
- **`useState`**: Explain state persistence across renders.
- **`useEffect`**: Explain synchronization with external systems and the dependency array.
- **`useMemo` / `useCallback`**: Explain referential stability and preventing expensive re-calculations.

## 2. Component Composition
Show how to favor `children` over complex boolean props.
- Explain the "Prop Drilling" problem and how composition or Context solves it.

## 3. Performance & Re-renders
Explain what triggers a re-render.
- Props changes, state changes, or parent re-renders.
- How `React.memo` bails out of the render process.

## 4. JSX & Semantics
- Explain why we use `Fragment` (`<>`) instead of extra `<div>`s.
- Explain the difference between `className` and `class`.

## 5. State Management Patterns
- **Lifting State Up**: Explain why state should live in the closest common ancestor.
- **Controlled vs Uncontrolled Components**: Explain the flow of data.

---

### Example Comment Pattern:
```javascript
// Note 1: We use the dependency array [props.id] to ensure this 
// effect only re-runs when the ID changes. This prevents 
// infinite loops or unnecessary API calls.
useEffect(() => {
  fetchData(props.id);
}, [props.id]);
```
