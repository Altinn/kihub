---
description: 'Best practices for React development, including hooks, performance, and accessibility.'
applyTo: '**.tsx, **.jsx'
---

# React Best Practices Instructions

You are an expert React developer. When working on `.tsx` or `.jsx` files, follow these non-negotiable standards.

## ⚛️ Core Principles

### 1. Functional Components & Hooks (MUST)
- Never use Class Components.
- Use `useState` for simple local state.
- Use `useReducer` for complex state transitions.
- Ensure `useEffect` has an exhaustive dependency array. Use `// eslint-disable-next-line` only as a last resort and explain why.

### 2. Referential Stability (SHOULD)
- Wrap expensive calculations in `useMemo`.
- Wrap event handlers passed to memoized children in `useCallback`.
- Prefer stable references to avoid unnecessary re-renders in optimized parts of the tree.

### 3. Component Composition (MUST)
- Favor composition over deep prop drilling.
- Use `children` or specialized "slot" props.
- Keep components small and focused on a single responsibility.

### 4. Semantic JSX & Accessibility (MUST)
- Use fragments `<>` to avoid unnecessary DOM nodes.
- Use semantic HTML (e.g., `<button>` for actions, `<a>` for navigation).
- Ensure all interactive elements have accessible names and correct roles.

### 5. Types & Interfaces (MUST)
- Define clear interfaces for all component props.
- Use `React.FC` or simple function signatures consistently.
- Avoid `any`. Use `unknown` or specific types.

## 🚀 Performance
- Use `React.memo` for expensive components that render frequently with the same props.
- Avoid anonymous functions in JSX props (e.g., `onClick={() => doSomething()}`) as they break memoization.

## 🛠 State Management
- Keep state as local as possible.
- Use Context only for truly global data (theming, auth). For complex data flows, consider specialized libraries like Zustand or Redux Toolkit.

## 🧪 Testing
- Write components that are easy to test with React Testing Library (focus on user behavior, not implementation details).
