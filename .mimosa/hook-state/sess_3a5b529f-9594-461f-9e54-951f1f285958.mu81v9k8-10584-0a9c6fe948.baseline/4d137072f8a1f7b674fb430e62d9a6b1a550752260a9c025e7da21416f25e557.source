/** next/link 的适配层：保持 v3 组件的 href 用法不变。 */
import { Link as RouterLink, LinkProps as RouterLinkProps } from "react-router-dom";
import * as React from "react";

type LinkProps = Omit<RouterLinkProps, "to"> & {
  href?: string;
  prefetch?: boolean; // 兼容 v3 用法，忽略
};

export function Link({ href, children, ...rest }: LinkProps) {
  return (
    <RouterLink to={href ?? ""} {...rest}>
      {children}
    </RouterLink>
  );
}

export default Link;
