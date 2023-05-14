import Link from "next/link";

interface Props {
  name?: string;
  href: string;
  icon?: any;
  selectedIcon?: any;
  current?: boolean;
}

export default function NavMenu(props: Props) {
  return (
    <Link
      prefetch={false}
      href={props.href}
      className={[
        props.current
          ? "bg-stone-700 text-white"
          : "text-gray-400 hover:bg-zinc-800 hover:text-white",
        "relative group w-full p-2 rounded-md flex flex-col items-center text-xs font-medium",
      ].join(" ")}
      aria-current={props.current ? "page" : undefined}
    >
      <div
        className={[
          "transition-al duration-300",
          props.current ? "opacity-1" : "opacity-0",
          "w-1 my-4 bg-blue-600 absolute left-0 inset-y-0",
        ].join(" ")}
      ></div>
      <div className=" text-gray-400 group-hover:text-white ">
        <props.icon
          className={[
            "h-6 w-6 transition-all duration-300 absolute",
            props.current ? "translate-y-2 opacity-0" : "opacity-100",
          ].join(" ")}
          aria-hidden="true"
        />
        <props.icon
          className={[
            "h-6 w-6 transition-all duration-300 text-blue-600",
            props.current ? "translate-y-2 opacity-100 " : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>
      <span
        className={[
          "transition-all duration-300",
          props.current ? "translate-y-2 opacity-0" : "opacity-100",
        ].join(" ")}
      >
        {props.name}
      </span>
    </Link>
  );
}
