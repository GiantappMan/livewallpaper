import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
  name?: string;
  href: string;
  icon?: any;
  selectedIcon?: any;
  current?: boolean;
  badge?: number;
}

export default function NavMenuItem(props: Props) {
  return (
    <Link
      prefetch={false}
      title={props.name}
      href={props.href}
      className={cn([
        props.current ? "bg-secondary" : "text-muted-foreground hover:bg-accent hover:text-primary",
        "relative group w-full p-2 rounded-md flex flex-col items-center text-xs font-medium",
      ])}
      aria-current={props.current ? "page" : undefined}
    >
      <div
        className={[
          "transition-al duration-300",
          props.current ? "opacity-1" : "opacity-0",
          "w-1 my-4 bg-primary absolute left-0 inset-y-0",
        ].join(" ")}
      >
        {/* 左边条 */}
      </div>
      <div>
        {/* 未选中 */}
        <props.icon
          className={[
            "h-6 w-6 transition-all duration-300 absolute ",
            props.current ? "translate-y-2 opacity-0" : "opacity-100",
          ].join(" ")}
          aria-hidden="true"
        />
        {/* 选中 */}
        <props.icon
          className={[
            "h-6 w-6 transition-all duration-300 text-primary",
            props.current ? "translate-y-2 opacity-100 " : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>
      {props.badge ? (
        <span
          className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center"
          title={props.badge > 99 ? "99+" : String(props.badge)}
        >
          {props.badge > 99 ? "99+" : props.badge}
        </span>
      ) : null}
      <span
        className={[
          "transition-all duration-300 whitespace-nowrap",
          props.current ? "translate-y-2 opacity-0" : "opacity-100",
        ].join(" ")}
      >
        {props.name}
      </span>
    </Link>
  );
}
