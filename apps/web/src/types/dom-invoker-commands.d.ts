// The HTML Invoker Commands API (`command`/`commandfor` on <button>, driving a <dialog> or
// popover declaratively, no JS required in supporting browsers) is not yet typed by @types/react
// 19.2 on plain intrinsic elements — only `@digdir/designsystemet-react`'s own `Button`/`Dialog`
// components declare it themselves. This augmentation types it for OUR plain <button> elements
// (017, subscriptions banner) so we don't have to restyle/fork Designsystemet's Button primitive
// just to get a custom-styled trigger (see .claude/../specs/017-fix-subscriptions-banner/research.md).
import 'react';

declare module 'react' {
  interface ButtonHTMLAttributes<T> {
    command?: string;
    commandfor?: string;
  }
}
