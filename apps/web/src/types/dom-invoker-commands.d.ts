// The HTML Invoker Commands API (`command`/`commandfor` on <button>, driving a <dialog> or
// popover declaratively, no JS required in supporting browsers) is not yet typed by @types/react
// 19.2 on plain intrinsic elements. This augmentation types it for our plain `ds-button`/`ds-chip`
// <button> elements that open and close the subscriptions dialogs (017; plain HTML since 026,
// with `@digdir/designsystemet-web` polyfilling the API in browsers that lack it).
import 'react';

declare module 'react' {
  interface ButtonHTMLAttributes<T> {
    command?: string;
    commandfor?: string;
  }
}
