import { cn } from "@/lib/utils";
import Link from "@/components/link";

interface Props {
  name?: string;
  href: string;
  icon?: any;
  selectedIcon?: any;
  current?: boolean;
  /** 角标数字（如进行中的下载任务数），0 或缺省不显示 */
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
        "relative group w-full px-2 py-[clamp(5px,1vh,7px)] rounded-md flex flex-col items-center text-xs font-medium",
      ])}
      aria-current={props.current ? "page" : undefined}
    >
      <div
        className={[
          "transition-all duration-300",
          props.current ? "opacity-1" : "opacity-0",
          "w-[3px] h-[clamp(18px,3.4vh,23px)] bg-primary absolute left-0 top-1/2 -translate-y-1/2 rounded-full",
        ].join(" ")}
      >
        {/* 左边条 */}
      </div>
      <div className="relative">
        {/* 未选中 */}
        <props.icon
          className={[
            "h-[clamp(22px,4.1vh,28px)] w-[clamp(22px,4.1vh,28px)] transition-all duration-300 absolute ",
            props.current ? "translate-y-[clamp(4px,1vh,7px)] opacity-0" : "opacity-100",
          ].join(" ")}
          aria-hidden="true"
        />
        {/* 选中 */}
        <props.icon
          className={[
            "h-[clamp(22px,4.1vh,28px)] w-[clamp(22px,4.1vh,28px)] transition-all duration-300 text-primary",
            props.current ? "translate-y-[clamp(4px,1vh,7px)] opacity-100 " : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        />
        {props.badge != null && props.badge > 0 && (
          <span
            className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] leading-4 text-center font-semibold"
            aria-hidden="true"
          >
            {props.badge > 99 ? "99+" : props.badge}
          </span>
        )}
      </div>
      <span
        className={[
          "transition-all duration-300 whitespace-nowrap text-[clamp(10px,1.75vh,12px)]",
          props.current ? "translate-y-[clamp(4px,1vh,7px)] opacity-0" : "opacity-100",
        ].join(" ")}
      >
        {props.name}
      </span>
    </Link>
  );
}
