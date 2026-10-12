import { ToastProvider } from '@/components/ui/toast'

/**
 * Risk Map 路由的 layout。
 *
 * 这里挂载 ToastProvider,使得 `src/app/riskmap/page.tsx`(以及未来
 * 该路由下的子页面)顶层就可以调用 `useToast()` 拿到上下文。
 *
 * 为什么不放在 page.tsx 内部:
 *   - `useToast()` 是 hook,会在组件函数体顶部执行
 *   - 若 Provider 在 return 内部渲染,hook 执行时 Provider 还未挂载
 *     → `useToast must be used within a ToastProvider`
 *   - Next.js app router 的 layout 在 page 外层,Provider 在 children
 *     进入前已经存在,hook 即可正常取到上下文
 */
export default function RiskMapLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}